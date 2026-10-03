// POST /api/cancel
//   { contact }            -> { items: [{ id, barber, service, date, time }] }  (budúce termíny s týmto telefónom/e-mailom)
//   { contact, id, barber } -> { ok: true }  (termín sa zruší v kalendári barbera aj v spoločnom)
const { SERVICES, BARBER_NAMES, HORIZON_DAYS, calendarId } = require('./_lib/config');
const { todayStr, minuteOfDay, hhmm } = require('./_lib/time');
const { listEvents, deleteEvent } = require('./_lib/google');
const { sendMail, notifyOwner } = require('./_lib/mail');

const phoneKey = (p) => String(p || '').replace(/\D/g, '').slice(-9);

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
    b = b || {};
    const contact = String(b.contact || '').trim().slice(0, 120);
    const isMail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
    const pk = phoneKey(contact);
    if (!isMail && pk.length < 9) return res.status(400).json({ error: 'Zadaj telefónne číslo alebo e-mail, s ktorým si rezervoval.' });
    const mail = contact.toLowerCase();
    const matches = (pr, desc) => {
      if (pr.barberis !== '1') return false;
      if (isMail) return pr.emailKey === mail || new RegExp('E-mail:\\s*' + mail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*$', 'im').test(desc || '');
      return pr.phoneKey === pk || phoneKey(pr.phone) === pk;
    };
    const from = Date.now(), to = from + (HORIZON_DAYS + 5) * 86400000;

    const mine = [];
    const lists = await Promise.all(BARBER_NAMES.map((barber) => {
      const cal = calendarId(barber);
      return cal ? listEvents(cal, from, to, '&maxResults=250').then((r) => ({ barber, r })) : null;
    }).filter(Boolean));
    for (const { barber, r } of lists) {
      (r.items || []).forEach((e) => {
        if (e.status === 'cancelled' || !e.start || !e.start.dateTime) return;
        const ms = Date.parse(e.start.dateTime);
        const pr = (e.extendedProperties && e.extendedProperties.private) || {};
        if (!matches(pr, e.description)) return;
        mine.push({ id: e.id, barber, ms, service: SERVICES[pr.service] ? SERVICES[pr.service].name : (e.summary || ''),
          date: todayStr(ms), time: hhmm(minuteOfDay(ms)),
          name: ((e.description || '').match(/Zákazník:\s*(.+)/) || [])[1] || '',
          phone: pr.phone || '',
          email: pr.emailKey || ((e.description || '').match(/E-mail:\s*(\S+)/) || [])[1] || '' });
      });
    }
    mine.sort((a, c) => a.ms - c.ms);

    if (!b.id) {
      return res.status(200).json({ items: mine.slice(0, 10).map(({ ms, ...rest }) => rest) });
    }

    const target = mine.find((m) => m.id === String(b.id) && m.barber === String(b.barber));
    if (!target) return res.status(404).json({ error: 'Termín sa nenašiel (možno už je zrušený).' });
    await deleteEvent(calendarId(target.barber), target.id);
    const shared = process.env.CAL_SHARED;
    if (shared) {
      try {
        const m = await listEvents(shared, from, to, '&privateExtendedProperty=' + encodeURIComponent('source=' + target.id));
        for (const e of (m.items || [])) await deleteEvent(shared, e.id).catch(() => {});
      } catch (e) { console.error('shared cancel', e); }
    }
    const when = target.date.split('-').reverse().join('. ') + ' o ' + target.time;
    if (target.email) {
      await sendMail(target.email, 'Zrušenie termínu – BARBERIS',
        'Ahoj ' + (target.name || '') + ',\n\ntvoj termín bol zrušený:\n' + target.service + ' u ' + target.barber + '\n' + when +
        '\n\nNový termín si môžeš rezervovať na webe:\nhttps://barberis-barber-prievidza.com/\nalebo na čísle 0951 833 488.\n\nBARBERIS');
    }
    await notifyOwner('cancel', { when, service: target.service, barber: target.barber, name: target.name, phone: target.phone, email: target.email });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Termín sa nepodarilo zrušiť. Zavolaj nám prosím na 0951 833 488.' });
  }
};
