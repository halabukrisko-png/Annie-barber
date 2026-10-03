// Minimálny klient Google Calendar API cez service account (bez závislostí).
const crypto = require('crypto');
const { localToMs } = require('./time');

let tokenCache = null;

const unquote = (v) => String(v || '').trim().replace(/^["']+|["',]+$/g, '').trim();

// Údaje service accountu: buď celý JSON súbor v GOOGLE_SERVICE_ACCOUNT_JSON,
// alebo samostatne GOOGLE_SERVICE_ACCOUNT_EMAIL + GOOGLE_PRIVATE_KEY.
function credentials() {
  let email, key;
  const raw = (process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '').trim();
  if (raw) {
    let j = null;
    try { j = JSON.parse(raw); } catch (e) { /* neúplný JSON – skúsime vytiahnuť polia */ }
    if (j && typeof j === 'object') { email = j.client_email; key = j.private_key; }
    else {
      const m = (name) => { const r = new RegExp('"?' + name + '"?\\s*:\\s*"([^"]*)"').exec(raw); return r && r[1]; };
      email = m('client_email'); key = m('private_key');
      if (!key) { const k = /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----(?:\\n)?/.exec(raw); key = k && k[0]; }
      if (!email) email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      if (!email || !key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON: chýba client_email alebo private_key (dĺžka ' + raw.length + ')');
    }
  } else {
    email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL; key = process.env.GOOGLE_PRIVATE_KEY;
  }
  email = unquote(email);
  key = unquote(key).replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Chýbajú údaje service accountu (GOOGLE_SERVICE_ACCOUNT_JSON)');
  return { email, key };
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

async function getToken() {
  if (tokenCache && tokenCache.exp > Date.now() + 60000) return tokenCache.token;
  const { email, key } = credentials();
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
  if (!r.ok) throw new Error('Google auth (' + email + '): ' + (j.error_description || j.error));
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pri dočasnej chybe (sieť, 429, 5xx) sa volanie zopakuje; zrušenie už zrušenej udalosti (404/410) je úspech.
async function call(method, path, body) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt) await sleep(400 * attempt);
    try {
      const r = await fetch('https://www.googleapis.com/calendar/v3' + path, {
        method,
        headers: { Authorization: 'Bearer ' + (await getToken()), 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (r.status === 204) return null;
      const j = await r.json().catch(() => ({}));
      if (method === 'DELETE' && (r.status === 404 || r.status === 410)) return null;
      if (!r.ok) {
        lastErr = new Error('Google Calendar ' + r.status + ': ' + ((j.error && j.error.message) || ''));
        if (r.status === 401) tokenCache = null;
        if (r.status === 429 || r.status >= 500 || r.status === 401) continue;
        throw lastErr;
      }
      return j;
    } catch (e) {
      if (e === lastErr && !/Google Calendar (429|5|401)/.test(e.message)) throw e;
      lastErr = e;
    }
  }
  throw lastErr;
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
  // Udalosti označené ako "voľný" čas (predvolené pri celodenných, často aj pri prestávkach) freeBusy nevidí.
  // Pre barbera ich berieme ako obsadené vždy – celodenné na celý deň, ostatné na ich čas.
  await Promise.all(calendarIds.map(async (id) => {
    const j2 = await listEvents(id, fromMs, toMs, '&maxResults=250&fields=items(status,transparency,start,end)').catch((e) => { console.error('listEvents', id, e.message); return { items: [] }; });
    (j2.items || []).forEach((ev) => {
      if (ev.status === 'cancelled' || !ev.start || !ev.end) return;
      if (ev.start.date && ev.end.date) out[id].push({ start: localToMs(ev.start.date, 0), end: localToMs(ev.end.date, 0) });
      else if (ev.transparency === 'transparent' && ev.start.dateTime && ev.end.dateTime) out[id].push({ start: Date.parse(ev.start.dateTime), end: Date.parse(ev.end.dateTime) });
    });
  }));
  return out;
}

const insertEvent = (calId, ev) => call('POST', '/calendars/' + encodeURIComponent(calId) + '/events', ev);
const deleteEvent = (calId, id) => call('DELETE', '/calendars/' + encodeURIComponent(calId) + '/events/' + encodeURIComponent(id));
const listEvents = (calId, fromMs, toMs, extra) =>
  call('GET', '/calendars/' + encodeURIComponent(calId) + '/events?singleEvents=true&showDeleted=false&timeMin=' +
    encodeURIComponent(new Date(fromMs).toISOString()) + '&timeMax=' + encodeURIComponent(new Date(toMs).toISOString()) + (extra || ''));

// Udalosti zapísané ručne do spoločného kalendára (CAL_SHARED) – blokujú všetkých barberov.
// Zrkadlené rezervácie (barberis=1) sa preskakujú, tie patria len konkrétnemu barberovi.
async function sharedBlocks(fromMs, toMs) {
  const id = process.env.CAL_SHARED;
  if (!id) return [];
  const j = await listEvents(id, fromMs, toMs, '&maxResults=250&fields=items(status,start,end,extendedProperties)');
  const out = [];
  (j.items || []).forEach((ev) => {
    if (ev.status === 'cancelled' || !ev.start || !ev.end) return;
    if (ev.extendedProperties && ev.extendedProperties.private && ev.extendedProperties.private.barberis === '1') return;
    if (ev.start.date && ev.end.date) out.push({ start: localToMs(ev.start.date, 0), end: localToMs(ev.end.date, 0) });
    else if (ev.start.dateTime && ev.end.dateTime) out.push({ start: Date.parse(ev.start.dateTime), end: Date.parse(ev.end.dateTime) });
  });
  return out;
}

module.exports = { sharedBlocks, freeBusy, insertEvent, deleteEvent, listEvents };
