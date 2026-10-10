// Overenie telefónu SMS kódom s vlastným textom cez Twilio Messaging (bez Verify).
// Kód sa nikde neukladá: odvodí sa z tajného VERIFY_SECRET a ID rezervácie (vid), ktoré je v podpísanom tokene.
// Zapína sa nastavením TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM a VERIFY_SECRET.
const crypto = require('crypto');

const TTL_MIN = 10;
const MAX_TRIES = 5;
const smsEnabled = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM && process.env.VERIFY_SECRET);

// 0951 833 488 -> +421951833488 (číslo bez predvoľby sa berie ako slovenské)
function toE164(p) {
  let s = String(p || '').replace(/[^\d+]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('+')) return /^\+\d{9,15}$/.test(s) ? s : null;
  if (s.startsWith('0')) s = '+421' + s.slice(1);
  else s = '+' + (s.length === 9 ? '421' : '') + s;
  return /^\+\d{9,15}$/.test(s) ? s : null;
}

const codeFor = (vid) => {
  const h = crypto.createHmac('sha256', process.env.VERIFY_SECRET).update('sms:' + vid).digest();
  return String(h.readUInt32BE(0) % 1000000).padStart(6, '0');
};

async function sendCode(phone, lang, vid) {
  const to = toE164(phone);
  if (!to || !vid) return false;
  const code = codeFor(vid);
  const body = lang === 'en'
    ? 'BARBERIS: your verification code is ' + code + '. Valid for ' + TTL_MIN + ' minutes.'
    : 'BARBERIS: tvoj overovací kód je ' + code + '. Platí ' + TTL_MIN + ' minút.';
  try {
    const r = await fetch('https://api.twilio.com/2010-04-01/Accounts/' + process.env.TWILIO_ACCOUNT_SID + '/Messages.json', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM, Body: body }).toString(),
    });
    if (!r.ok) console.error('sms send', r.status, await r.text().catch(() => ''));
    return r.ok;
  } catch (e) { console.error('sms send', e); return false; }
}

// Obmedzenie pokusov (best-effort: počíta sa v pamäti inštancie, platnosť kódu je navyše krátka)
const tries = new Map();
// Vráti 'ok' | 'wrong' | 'locked'
function checkCode(vid, code) {
  const now = Date.now();
  tries.forEach((v, k) => { if (v.t < now) tries.delete(k); });
  const e = tries.get(vid) || { n: 0, t: now + TTL_MIN * 60000 };
  if (e.n >= MAX_TRIES) return 'locked';
  const a = Buffer.from(codeFor(vid)), b = Buffer.from(String(code || ''));
  if (a.length === b.length && crypto.timingSafeEqual(a, b)) return 'ok';
  e.n++; tries.set(vid, e);
  return e.n >= MAX_TRIES ? 'locked' : 'wrong';
}

module.exports = { smsEnabled, toE164, sendCode, checkCode, TTL_MIN };
