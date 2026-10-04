// POST /api/book { service, barber, date, time, name, phone, email }
const { SERVICES, BARBERS, BARBER_NAMES, HORIZON_DAYS, TZ, durationFor, calendarId } = require('./_lib/config');
const { localToMs, addDays, todayStr, isDateStr } = require('./_lib/time');
const { freeBusy, sharedBlocks, insertEvent, deleteEvent, listEvents } = require('./_lib/google');
const { daySlots } = require('./_lib/slots');
const { mailCustomer, notifyOwner } = require('./_lib/mail');

const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-9);
const clean = (s, n) => String(s || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, n);

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const b = await readBody(req);
    if (b.website) return res.status(200).json({ ok: true }); // honeypot

    const service = clean(b.service, 20), barber = clean(b.barber, 20), date = clean(b.date, 10), time = clean(b.time, 5);
    const name = clean(b.name, 80), phone = clean(b.phone, 30), email = clean(b.email, 120);
    if (!SERVICES[service]) return res.status(400).json({ error: 'Neznáma služba' });
    if (barber && !BARBER_NAMES.includes(barber)) return res.status(400).json({ error: 'Neznámy barber' });
    if (!isDateStr(date) || !/^\d{2}:\d{2}$/.test(time)) return res.status(400).json({ error: 'Neplatný termín' });
    if (name.length < 2) return res.status(400).json({ error: 'Zadaj meno', field: 'name' });
    if (b.consent !== true) return res.status(400).json({ error: 'Je potrebný súhlas so spracovaním osobných údajov', field: 'consent' });
    if (phone.replace(/\D/g, '').length < 9) return res.status(400).json({ error: 'Zadaj platné telefónne číslo', field: 'phone' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Neplatný e-mail', field: 'email' });

    const nowMs = Date.now();
    if (date > addDays(todayStr(nowMs), HORIZON_DAYS)) return res.status(400).json({ error: 'Termín je príliš ďaleko' });

    const names = barber ? [barber] : BARBER_NAMES;
    const ids = names.map(calendarId);
    if (ids.some((i) => !i)) return res.status(503).json({ error: 'Kalendár nie je nastavený' });
    const sharedId = process.env.CAL_SHARED || null;

    const dayFrom = localToMs(date, 0), dayTo = localToMs(addDays(date, 1), 0);
    const [busy, shared] = await Promise.all([freeBusy(ids, dayFrom, dayTo), sharedBlocks(dayFrom, dayTo)]);
    const busyByBarber = {};
    names.forEach((n, i) => { busyByBarber[n] = busy[ids[i]].concat(shared); });
    const slot = daySlots({ date, barber, service, busyByBarber, nowMs }).find((s) => s.time === time);
    if (!slot) return res.status(409).json({ error: 'Tento čas už nie je voľný. Vyber si, prosím, iný.', taken: true });

    const who = slot.barber;
    const dur = durationFor(service, who);
    const startMs = slot.start, endMs = startMs + dur * 60000;
    const svc = SERVICES[service];
    const lang = b.lang === 'en' ? 'en' : 'sk';
    const iso = (ms) => new Date(ms).toISOString();
    const when = date.split('-').reverse().join('. ') + ' o ' + time;
    const description = '✂️ ' + svc.name + ' · ' + svc.price + ' · ' + dur + ' min\n' +
      BARBERS[who].icon + ' Barber: ' + who + '\n' +
      '👤 Zákazník: ' + name + '\n' +
      '📞 Telefón: ' + phone + (email ? '\n✉️ E-mail: ' + email : '') +
      '\n\nRezervované cez web.';
    const base = { start: { dateTime: iso(startMs), timeZone: TZ }, end: { dateTime: iso(endMs), timeZone: TZ }, description,
      colorId: BARBERS[who].colorId, reminders: { useDefault: false },
      extendedProperties: { private: { barberis: '1', barber: who, service, phone, phoneKey: phoneKey(phone), emailKey: email.toLowerCase(), lang } } };

    const own = await insertEvent(calendarId(who), Object.assign({ summary: svc.name + ' · ' + name }, base));

    // ochrana proti súbehu: ak sa v rovnakom čase vytvoril iný termín skôr, ten náš zrušíme
    const near = await listEvents(calendarId(who), startMs, endMs);
    const clash = (near.items || []).some((e) => e.id !== own.id && e.status !== 'cancelled' &&
      e.transparency !== 'transparent' && e.created && own.created && e.created < own.created);
    if (clash) {
      await deleteEvent(calendarId(who), own.id).catch(() => {});
      return res.status(409).json({ error: 'Tento čas sa práve obsadil. Vyber si, prosím, iný.', taken: true });
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
    return res.status(200).json({ ok: true, barber: who, time, date, duration: dur });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Rezerváciu sa nepodarilo uložiť. Skús to prosím znova alebo zavolaj.' });
  }
};
