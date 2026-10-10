// Overenie telefónneho čísla SMS kódom cez Twilio Verify (kód generuje, posiela a kontroluje Twilio vrátane limitu pokusov).
// Zapína sa nastavením TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN a TWILIO_VERIFY_SID (+ VERIFY_SECRET na podpis rezervácie).
const smsEnabled = () => !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_VERIFY_SID && process.env.VERIFY_SECRET);

// 0951 833 488 -> +421951833488 (číslo bez predvoľby sa berie ako slovenské)
function toE164(p) {
  let s = String(p || '').replace(/[^\d+]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('+')) return /^\+\d{9,15}$/.test(s) ? s : null;
  if (s.startsWith('0')) s = '+421' + s.slice(1);
  else s = '+' + (s.length === 9 ? '421' : '') + s;
  return /^\+\d{9,15}$/.test(s) ? s : null;
}

async function call(path, params) {
  const r = await fetch('https://verify.twilio.com/v2/Services/' + process.env.TWILIO_VERIFY_SID + path, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(process.env.TWILIO_ACCOUNT_SID + ':' + process.env.TWILIO_AUTH_TOKEN).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, j };
}

// Pošle SMS s kódom. Vráti true/false.
async function sendCode(phone, lang) {
  const to = toE164(phone);
  if (!to) return false;
  try {
    const r = await call('/Verifications', { To: to, Channel: 'sms', Locale: lang === 'en' ? 'en' : 'sk' });
    if (r.status >= 300) console.error('sms send', r.status, JSON.stringify(r.j));
    return r.status < 300;
  } catch (e) { console.error('sms send', e); return false; }
}

// Vráti 'ok' | 'wrong' | 'expired' | 'error'
async function checkCode(phone, code) {
  const to = toE164(phone);
  if (!to) return 'error';
  try {
    const r = await call('/VerificationCheck', { To: to, Code: String(code || '').replace(/\D/g, '') });
    if (r.status === 404) return 'expired'; // vypršal, už schválený alebo prekročený počet pokusov
    if (r.status >= 300) { console.error('sms check', r.status, JSON.stringify(r.j)); return 'error'; }
    return r.j.status === 'approved' ? 'ok' : 'wrong';
  } catch (e) { console.error('sms check', e); return 'error'; }
}

module.exports = { smsEnabled, toE164, sendCode, checkCode };
