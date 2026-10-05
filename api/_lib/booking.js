// Samotné vytvorenie rezervácie (kontrola voľného času + zápis do kalendárov + e-maily).
const { SERVICES, BARBERS, BARBER_NAMES, HORIZON_DAYS, TZ, durationFor, calendarId } = require('./config');
const { localToMs, addDays, todayStr } = require('./time');
const { freeBusy, sharedBlocks, insertEvent, deleteEvent, listEvents } = require('./google');
const { daySlots } = require('./slots');
const { mailCustomer, notifyOwner } = require('./mail');

const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-9);

const MAX_ACTIVE = 2; // max. počet budúcich rezervácií na jedno telefónne číslo / e-mail
const DISPOSABLE = /@(mailinator|guerrillamail|10minutemail|tempmail|temp-mail|yopmail|trashmail|sharklasers|getnada|dispostable|maildrop|throwawaymail|fakeinbox|mohmal|emailondeck)\./i;

// true, ak má kontakt už MAX_ACTIVE budúcich rezervácií (ochrana proti zahlteniu falošnými rezerváciami)
async function overLimit(phone, email) {
  const pk = phoneKey(phone), em = String(email || '').toLowerCase();
  const from = Date.now(), to = from + (HORIZON_DAYS + 5) * 86400000;
  const lists = await Promise.all(BARBER_NAMES.map(calendarId).filter(Boolean).map((id) =>
    listEvents(id, from, to, '&maxResults=250&fields=items(status,extendedProperties)').catch(() => ({ items: [] }))));
  let n = 0;
  lists.forEach((r) => (r.items || []).forEach((e) => {
    const pr = (e.extendedProperties && e.extendedProperties.private) || {};
    if (e.status === 'cancelled' || pr.barberis !== '1') return;
    if ((pk && pr.phoneKey === pk) || (em && pr.emailKey === em)) n++;
  }));
  return n >= MAX_ACTIVE;
}

const LIMIT_MSG = 'Na tento telefón alebo e-mail už máš maximálny počet rezervácií. Ak potrebuješ ďalší termín, zavolaj nám na 0951 833 488.';

// d: { service, barber, date, time, name, phone, email, lang, vid? } (už overené). Vráti { status, body }.
// Ak je zadané vid (ID overenej rezervácie), opakované použitie rovnakého odkazu rezerváciu nezdvojí.
async function createBooking(d) {
  const { service, barber, date, time, name, phone, email, lang, vid } = d;
  const nowMs = Date.now();
  if (date > addDays(todayStr(nowMs), HORIZON_DAYS)) return { status: 400, body: { error: 'Termín je príliš ďaleko' } };

  const names = barber ? [barber] : BARBER_NAMES;
  const ids = names.map(calendarId);
  if (ids.some((i) => !i)) return { status: 503, body: { error: 'Kalendár nie je nastavený' } };
  const sharedId = process.env.CAL_SHARED || null;

  const dayFrom = localToMs(date, 0), dayTo = localToMs(addDays(date, 1), 0);
  if (vid) { // rovnaký odkaz použitý opakovane: rezervácia už existuje
    const days = await Promise.all(ids.map((id) => listEvents(id, dayFrom, dayTo)));
    const dup = days.some((r) => (r.items || []).some((e) => e.status !== 'cancelled' && e.extendedProperties && e.extendedProperties.private && e.extendedProperties.private.vid === vid));
    if (dup) return { status: 200, body: { ok: true, already: true, time, date } };
  }
  if (await overLimit(phone, email)) return { status: 429, body: { error: LIMIT_MSG } };
  const [busy, shared] = await Promise.all([freeBusy(ids, dayFrom, dayTo), sharedBlocks(dayFrom, dayTo)]);
  const busyByBarber = {};
  names.forEach((n, i) => { busyByBarber[n] = busy[ids[i]].concat(shared); });
  const slot = daySlots({ date, barber, service, busyByBarber, nowMs }).find((s) => s.time === time);
  if (!slot) return { status: 409, body: { error: 'Tento čas už nie je voľný. Vyber si, prosím, iný.', taken: true } };

  const who = slot.barber;
  const dur = durationFor(service, who);
  const startMs = slot.start, endMs = startMs + dur * 60000;
  const svc = SERVICES[service];
      const iso = (ms) => new Date(ms).toISOString();
  const when = date.split('-').reverse().join('. ') + ' o ' + time;
  const description = '✂️ ' + svc.name + ' · ' + svc.price + ' · ' + dur + ' min\n' +
    BARBERS[who].icon + ' Barber: ' + who + '\n' +
    '👤 Zákazník: ' + name + '\n' +
    '📞 Telefón: ' + phone + (email ? '\n✉️ E-mail: ' + email : '') +
    '\n\nRezervované cez web.';
  const base = { start: { dateTime: iso(startMs), timeZone: TZ }, end: { dateTime: iso(endMs), timeZone: TZ }, description,
    colorId: BARBERS[who].colorId, reminders: { useDefault: false },
    extendedProperties: { private: Object.assign({ barberis: '1', barber: who, service, phone, phoneKey: phoneKey(phone), emailKey: email.toLowerCase(), lang }, vid ? { vid } : {}) } };

  const own = await insertEvent(calendarId(who), Object.assign({ summary: svc.name + ' · ' + name }, base));

  // ochrana proti súbehu: ak sa v rovnakom čase vytvoril iný termín skôr, ten náš zrušíme
  const near = await listEvents(calendarId(who), startMs, endMs);
  const clash = (near.items || []).some((e) => e.id !== own.id && e.status !== 'cancelled' &&
    e.transparency !== 'transparent' && e.created && own.created && e.created < own.created);
  if (clash) {
    await deleteEvent(calendarId(who), own.id).catch(() => {});
    return { status: 409, body: { error: 'Tento čas sa práve obsadil. Vyber si, prosím, iný.', taken: true } };
  }

  if (sharedId) {
    await insertEvent(sharedId, Object.assign({ summary: BARBERS[who].icon + ' ' + who + ' · ' + svc.name + ' · ' + name,
      extendedProperties: { private: { barberis: '1', barber: who, service, phone, lang, source: own.id } } }, { start: base.start, end: base.end, description, colorId: base.colorId, reminders: base.reminders })).catch((e) => console.error('shared', e));
  }

  if (email) {
    const whenL = lang === 'en' ? date.split('-').reverse().join('. ') + ' at ' + time : when;
    await mailCustomer('new', lang, email, { name, when: whenL, service: lang === 'en' ? (svc.nameEn || svc.name) : svc.name, barber: who });
  }
  await notifyOwner('new', { when, service: svc.name, barber: who, name, phone, email });
  return { status: 200, body: { ok: true, barber: who, time, date, duration: dur } };
}

module.exports = { createBooking, phoneKey, overLimit, LIMIT_MSG, DISPOSABLE };
