// POST /api/book { service, barber, date, time, name, phone, email }
// S nastaveným Twilio (SMS kód, /api/confirm) alebo VERIFY_SECRET pošle zákazníkovi overovací e-mail; rezerváciu zapíše až /api/verify.
const { SERVICES, BARBER_NAMES, HORIZON_DAYS } = require('./_lib/config');
const { addDays, todayStr, isDateStr } = require('./_lib/time');
const { createBooking, overLimit, LIMIT_MSG, DISPOSABLE } = require('./_lib/booking');
const { verifyEnabled, sendVerification, makeToken } = require('./_lib/verify');
const { smsEnabled, toE164, sendCode } = require('./_lib/sms');

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

    if (DISPOSABLE.test(email)) return res.status(400).json({ error: 'Jednorazové e-maily nie sú povolené. Zadaj svoj bežný e-mail.', field: 'email' });
    const lang = b.lang === 'en' ? 'en' : 'sk';
    const data = { service, barber, date, time, name, phone, email, lang };

    // overenie telefónu: pošle sa SMS kód; rezervácia sa zapíše až po jeho zadaní (/api/confirm)
    if (smsEnabled()) {
      if (!toE164(phone)) return res.status(400).json({ error: 'Zadaj platné telefónne číslo', field: 'phone' });
      if (date > addDays(todayStr(Date.now()), HORIZON_DAYS)) return res.status(400).json({ error: 'Termín je príliš ďaleko' });
      if (await overLimit(phone, email)) return res.status(429).json({ error: LIMIT_MSG });
      if (!(await sendCode(phone, lang))) return res.status(503).json({ error: 'SMS s kódom sa nepodarilo odoslať. Skontroluj telefónne číslo alebo zavolaj.', field: 'phone' });
      return res.status(200).json({ ok: true, sms: true, token: makeToken(Object.assign({ sms: 1 }, data)) });
    }

    // overenie e-mailu: rezervácia sa zapíše až po kliknutí na odkaz v e-maile (/api/verify)
    if (verifyEnabled()) {
      const nowMs = Date.now();
      if (date > addDays(todayStr(nowMs), HORIZON_DAYS)) return res.status(400).json({ error: 'Termín je príliš ďaleko' });
      if (await overLimit(phone, email)) return res.status(429).json({ error: LIMIT_MSG });
      const sent = await sendVerification(data);
      if (!sent) return res.status(503).json({ error: 'Overovací e-mail sa nepodarilo odoslať. Skontroluj e-mail alebo zavolaj.', field: 'email' });
      return res.status(200).json({ ok: true, verify: true });
    }

    const r = await createBooking(data);
    return res.status(r.status).json(r.body);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Rezerváciu sa nepodarilo uložiť. Skús to prosím znova alebo zavolaj.' });
  }
};
