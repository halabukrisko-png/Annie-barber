// "Inteligentný" výpočet voľných termínov (čistá funkcia – ľahko testovateľná).
const { HOURS, LUNCH, breakFor, gridFor, LEAD_MIN, BARBER_NAMES, durationFor } = require('./config');
const { localToMs, weekday, hhmm, minuteOfDay } = require('./time');

const MIN = 60000;

// Voľné začiatky termínu pre jedného barbera.
// busy = [{start,end}] v ms. Vráti [{start(ms), minute, score}] – menší score = lepšie "nalepený" na okolité termíny.
function slotsForBarber(date, busy, dur, nowMs, barber) {
  const BREAK_MIN = breakFor(barber), GRID_MIN = gridFor(barber);
  const range = HOURS[weekday(date)];
  if (!range) return [];
  const open = localToMs(date, range[0]);
  const close = localToMs(date, range[1]);
  const earliest = nowMs + LEAD_MIN * MIN;
  const blocks = busy.filter((b) => b.end > open && b.start < close);
  const lunch = LUNCH[weekday(date)];
  if (lunch) blocks.push({ start: localToMs(date, lunch[0]), end: localToMs(date, lunch[1]) });
  blocks.sort((a, b) => a.start - b.start);

  // kandidáti: pravidelná mriežka + čas hneď po konci existujúceho termínu (+ prestávka)
  const cand = new Set();
  for (let m = range[0]; m + dur <= range[1]; m += GRID_MIN) cand.add(localToMs(date, m));
  blocks.forEach((b) => {
    const s = Math.ceil((b.end + BREAK_MIN * MIN) / MIN) * MIN;
    if (s >= open && s + dur * MIN <= close) cand.add(s);
  });

  const out = [];
  Array.from(cand).sort((a, b) => a - b).forEach((s) => {
    const e = s + dur * MIN;
    if (s < earliest || s < open || e > close) return;
    let prevEnd = open, nextStart = close, ok = true;
    for (const b of blocks) {
      if (s < b.end + BREAK_MIN * MIN && e + BREAK_MIN * MIN > b.start) { ok = false; break; }
      if (b.end <= s && b.end > prevEnd) prevEnd = b.end;
      if (b.start >= e && b.start < nextStart) nextStart = b.start;
    }
    if (!ok) return;
    // koľko "voľnej diery" ostane pred/po termíne okrem povinnej prestávky; 0 = nalepené
    const before = Math.max(0, (s - prevEnd) / MIN - (prevEnd === open ? 0 : BREAK_MIN));
    const after = Math.max(0, (nextStart - e) / MIN - (nextStart === close ? 0 : BREAK_MIN));
    out.push({ start: s, score: Math.min(before, after) });
  });
  return out;
}

// Všetky voľné časy v deň. barber = '' => ktorýkoľvek.
// Vráti [{ time:'HH:MM', start(ms), barber }] – pri "ktorýkoľvek" je barber ten, ku ktorému sa termín najlepšie hodí.
function daySlots({ date, barber, service, busyByBarber, nowMs }) {
  const names = barber ? [barber] : BARBER_NAMES;
  const load = {};
  names.forEach((n) => { load[n] = (busyByBarber[n] || []).length; });
  const byStart = new Map();
  names.forEach((n) => {
    const dur = durationFor(service, n);
    if (!dur) return;
    slotsForBarber(date, busyByBarber[n] || [], dur, nowMs, n).forEach((c) => {
      const cur = byStart.get(c.start);
      // najlepší = najtesnejšie nalepený, potom ten, kto je ten deň vyťaženejší (aby ostali celé voľné okná), potom poradie
      if (!cur || c.score < cur.score || (c.score === cur.score && load[n] > load[cur.barber])) {
        byStart.set(c.start, { start: c.start, score: c.score, barber: n });
      }
    });
  });
  return Array.from(byStart.values()).sort((a, b) => a.start - b.start).map((s) => ({
    time: hhmm(minuteOfDay(s.start)),
    start: s.start,
    barber: s.barber,
  }));
}

module.exports = { daySlots };
