// Pomocné funkcie pre čas v pásme Europe/Bratislava (server beží v UTC).
const { TZ } = require('./config');

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, hourCycle: 'h23',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

function partsAt(ms) {
  const o = {};
  fmt.formatToParts(new Date(ms)).forEach((p) => { o[p.type] = +p.value; });
  return o;
}

// Posun pásma (ms) v danom okamihu.
function offsetAt(ms) {
  const p = partsAt(ms);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}

// 'YYYY-MM-DD' + minúty od polnoci (miestny čas) -> UTC ms
function localToMs(dateStr, minutes) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const guess = Date.UTC(y, m - 1, d, 0, minutes);
  let ms = guess - offsetAt(guess);
  ms = guess - offsetAt(ms);
  return ms;
}

function weekday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

function todayStr(nowMs) {
  const p = partsAt(nowMs);
  return p.year + '-' + String(p.month).padStart(2, '0') + '-' + String(p.day).padStart(2, '0');
}

function isDateStr(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s || '')) return false;
  return addDays(s, 0) === s;
}

function hhmm(min) {
  return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0');
}

function minuteOfDay(ms) {
  const p = partsAt(ms);
  return p.hour * 60 + p.minute;
}

module.exports = { minuteOfDay, localToMs, weekday, addDays, todayStr, isDateStr, hhmm };
