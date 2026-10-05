// GET /api/verify?t=<token> – klik na odkaz z overovacieho e-mailu: zapíše rezerváciu a ukáže potvrdzovaciu stránku.
const { readToken } = require('./_lib/verify');
const { createBooking } = require('./_lib/booking');

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const T = {
  sk: {
    ok: ['Rezervácia potvrdená', 'Tvoj termín je rezervovaný. Potvrdenie ti príde e-mailom.'],
    already: ['Rezervácia už je potvrdená', 'Tento termín je už rezervovaný. Potvrdenie nájdeš v e-maile.'],
    taken: ['Termín už nie je voľný', 'Kým si potvrdzoval(a), termín sa obsadil. Vyber si, prosím, iný.'],
    expired: ['Odkaz vypršal', 'Odkaz na potvrdenie už neplatí. Vytvor si, prosím, rezerváciu znova.'],
    invalid: ['Neplatný odkaz', 'Odkaz nie je platný. Vytvor si, prosím, rezerváciu znova.'],
    error: ['Rezerváciu sa nepodarilo uložiť', 'Skús to prosím znova alebo nám zavolaj na 0951 833 488.'],
    btn: 'Späť na web', book: 'Rezervovať znova',
  },
  en: {
    ok: ['Booking confirmed', 'Your appointment is booked. A confirmation is on its way by email.'],
    already: ['Booking already confirmed', 'This appointment is already booked. Check your email for the confirmation.'],
    taken: ['Time no longer available', 'The slot was taken while you were confirming. Please choose another one.'],
    expired: ['Link expired', 'This confirmation link is no longer valid. Please make your booking again.'],
    invalid: ['Invalid link', 'This link is not valid. Please make your booking again.'],
    error: ['Could not save the booking', 'Please try again or call us at 0951 833 488.'],
    btn: 'Back to website', book: 'Book again',
  },
};

function page(res, status, lang, kind) {
  const L = T[lang === 'en' ? 'en' : 'sk'], k = L[kind];
  const retry = kind !== 'ok' && kind !== 'already';
  res.status(status).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.send('<!doctype html><html lang="' + (lang === 'en' ? 'en' : 'sk') + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>' + esc(k[0]) + ' – BARBERIS</title></head>' +
    '<body style="margin:0;background:#141311;color:#f4ede1;font-family:Arial,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;box-sizing:border-box">' +
    '<div style="max-width:420px;text-align:center"><div style="font-size:13px;letter-spacing:.2em;color:#c9a06a;margin-bottom:18px">BARBERIS</div>' +
    '<h1 style="font-size:24px;margin:0 0 12px">' + esc(k[0]) + '</h1><p style="line-height:1.55;color:#d9d1c2;margin:0 0 24px">' + esc(k[1]) + '</p>' +
    '<a href="' + (retry ? '/o-nas#booking' : '/') + '" style="display:inline-block;background:#c9a06a;color:#141311;text-decoration:none;padding:13px 24px;border-radius:2px;font-weight:700;font-size:13px;letter-spacing:.06em;text-transform:uppercase">' + esc(retry ? L.book : L.btn) + '</a></div></body></html>');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const t = readToken(req.query && req.query.t);
  const lang = t.data && t.data.lang;
  if (t.error) return page(res, 400, lang, t.error);
  try {
    const { exp, ...d } = t.data;
    const r = await createBooking(d);
    if (r.status === 200) return page(res, 200, lang, r.body.already ? 'already' : 'ok');
    if (r.body && r.body.taken) return page(res, 409, lang, 'taken');
    return page(res, r.status, lang, 'error');
  } catch (e) {
    console.error(e);
    return page(res, 500, lang, 'error');
  }
};
