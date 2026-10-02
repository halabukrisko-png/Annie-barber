// Minimálny klient Google Calendar API cez service account (bez závislostí).
const crypto = require('crypto');

let tokenCache = null;

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getToken() {
  if (tokenCache && tokenCache.exp > Date.now() + 60000) return tokenCache.token;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Chýba GOOGLE_SERVICE_ACCOUNT_EMAIL / GOOGLE_PRIVATE_KEY');
  const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const sig = b64url(crypto.createSign('RSA-SHA256').update(head + '.' + claim).sign(key));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + head + '.' + claim + '.' + sig,
  });
  const j = await r.json();
  if (!r.ok) throw new Error('Google auth: ' + (j.error_description || j.error));
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

async function call(method, path, body) {
  const r = await fetch('https://www.googleapis.com/calendar/v3' + path, {
    method,
    headers: { Authorization: 'Bearer ' + (await getToken()), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 204) return null;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Google Calendar ' + r.status + ': ' + ((j.error && j.error.message) || ''));
  return j;
}

// { calendarId: [{start, end} v ms] } – obsadené bloky (všetky nepriehľadné udalosti vrátane celodenných)
async function freeBusy(calendarIds, fromMs, toMs) {
  const j = await call('POST', '/freeBusy', {
    timeMin: new Date(fromMs).toISOString(),
    timeMax: new Date(toMs).toISOString(),
    items: calendarIds.map((id) => ({ id })),
  });
  const out = {};
  calendarIds.forEach((id) => {
    const c = (j.calendars || {})[id];
    if (!c || (c.errors && c.errors.length)) throw new Error('Kalendár nie je dostupný: ' + id + ' ' + JSON.stringify(c && c.errors));
    out[id] = (c.busy || []).map((b) => ({ start: Date.parse(b.start), end: Date.parse(b.end) }));
  });
  return out;
}

const insertEvent = (calId, ev) => call('POST', '/calendars/' + encodeURIComponent(calId) + '/events', ev);
const deleteEvent = (calId, id) => call('DELETE', '/calendars/' + encodeURIComponent(calId) + '/events/' + encodeURIComponent(id));
const listEvents = (calId, fromMs, toMs) =>
  call('GET', '/calendars/' + encodeURIComponent(calId) + '/events?singleEvents=true&showDeleted=false&timeMin=' +
    encodeURIComponent(new Date(fromMs).toISOString()) + '&timeMax=' + encodeURIComponent(new Date(toMs).toISOString()));

module.exports = { freeBusy, insertEvent, deleteEvent, listEvents };
