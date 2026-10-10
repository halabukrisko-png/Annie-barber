// Overenie e-mailu pred rezerváciou: údaje rezervácie sa podpíšu (HMAC) a pošlú v odkaze; zapíšu sa až po kliknutí.
const crypto = require('crypto');
const { SERVICES } = require('./config');
const { mailVerify, SITE } = require('./mail');

const TTL_MIN = 30;
const verifyEnabled = () => !!process.env.VERIFY_SECRET;
const b64 = (buf) => Buffer.from(buf).toString('base64url');
const sign = (s) => crypto.createHmac('sha256', process.env.VERIFY_SECRET).update(s).digest('base64url');

function makeToken(data, ttlMin) {
  const body = b64(JSON.stringify(Object.assign({ vid: crypto.randomBytes(9).toString('hex') }, data, { exp: Date.now() + (ttlMin || TTL_MIN) * 60000 })));
  return body + '.' + sign(body);
}

// Vráti { data } alebo { error: 'invalid' | 'expired' }
function readToken(t) {
  const [body, sig] = String(t || '').split('.');
  if (!body || !sig || !process.env.VERIFY_SECRET) return { error: 'invalid' };
  const want = sign(body);
  if (sig.length !== want.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return { error: 'invalid' };
  let data;
  try { data = JSON.parse(Buffer.from(body, 'base64url').toString()); } catch (e) { return { error: 'invalid' }; }
  if (!data || !(data.exp > Date.now())) return { error: 'expired', data };
  return { data };
}

async function sendVerification(d) {
  const svc = SERVICES[d.service];
  const en = d.lang === 'en';
  const when = d.date.split('-').reverse().join('. ') + (en ? ' at ' : ' o ') + d.time;
  const link = SITE + 'api/verify?t=' + makeToken(d);
  return mailVerify(d.lang, d.email, { name: d.name, when, service: en ? (svc.nameEn || svc.name) : svc.name, barber: d.barber }, link, TTL_MIN);
}

module.exports = { verifyEnabled, sendVerification, readToken, makeToken };
