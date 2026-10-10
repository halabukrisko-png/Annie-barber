// POST /api/confirm { token, code } – overí SMS kód a až potom zapíše rezerváciu do kalendára.
const { readToken } = require('./_lib/verify');
const { checkCode } = require('./_lib/sms');
const { createBooking } = require('./_lib/booking');

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const b = await readBody(req);
    const t = readToken(b.token);
    if (t.error === 'expired') return res.status(400).json({ error: 'Platnosť kódu vypršala. Vytvor si, prosím, rezerváciu znova.', expired: true });
    if (t.error || !t.data || !t.data.sms) return res.status(400).json({ error: 'Neplatná žiadosť. Vytvor si, prosím, rezerváciu znova.', expired: true });
    const code = String(b.code || '').replace(/\D/g, '');
    if (code.length < 4 || code.length > 10) return res.status(400).json({ error: 'Zadaj kód z SMS.', field: 'code' });

    const { exp, sms, ...d } = t.data;
    const c = checkCode(d.vid, code);
    if (c === 'wrong') return res.status(400).json({ error: 'Nesprávny kód. Skús to znova.', field: 'code' });
    if (c === 'locked') return res.status(400).json({ error: 'Príliš veľa nesprávnych pokusov. Pošli si nový kód.', expired: true });

    const r = await createBooking(d);
    return res.status(r.status).json(r.body);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Rezerváciu sa nepodarilo uložiť. Skús to prosím znova alebo zavolaj.' });
  }
};
