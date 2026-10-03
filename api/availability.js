// GET /api/availability?service=strih&barber=Anett|''&from=YYYY-MM-DD&to=YYYY-MM-DD
// -> { days: { 'YYYY-MM-DD': ['08:00', ...] } }  (prázdne pole = deň je obsadený)
const { SERVICES, BARBER_NAMES, HORIZON_DAYS, HOURS, calendarId } = require('./_lib/config');
const { localToMs, addDays, todayStr, isDateStr, weekday } = require('./_lib/time');
const { freeBusy, sharedBlocks } = require('./_lib/google');
const { daySlots } = require('./_lib/slots');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const q = req.query || {};
    const service = String(q.service || '');
    const barber = String(q.barber || '');
    if (!SERVICES[service]) return res.status(400).json({ error: 'Neznáma služba' });
    if (barber && !BARBER_NAMES.includes(barber)) return res.status(400).json({ error: 'Neznámy barber' });
    if (!isDateStr(q.from) || !isDateStr(q.to)) return res.status(400).json({ error: 'Neplatný dátum' });

    const nowMs = Date.now();
    const today = todayStr(nowMs);
    const last = addDays(today, HORIZON_DAYS);
    let from = q.from < today ? today : q.from;
    let to = q.to > last ? last : q.to;
    const days = {};
    if (from > to || addDays(from, 62) < to) return res.status(200).json({ days });

    const names = barber ? [barber] : BARBER_NAMES;
    const ids = names.map(calendarId);
    if (ids.some((i) => !i)) return res.status(503).json({ error: 'Kalendár nie je nastavený' });
    const fromMs = localToMs(from, 0), toMs = localToMs(addDays(to, 1), 0);
    const [busy, shared] = await Promise.all([freeBusy(ids, fromMs, toMs), sharedBlocks(fromMs, toMs)]);
    const busyByBarber = {};
    names.forEach((n, i) => { busyByBarber[n] = busy[ids[i]].concat(shared); });

    for (let d = from; d <= to; d = addDays(d, 1)) {
      const t = daySlots({ date: d, barber, service, busyByBarber, nowMs }).map((s) => s.time);
      if (t.length || HOURS[weekday(d)]) days[d] = t; // prázdne pole = otvorený deň, ale plne obsadený
    }
    return res.status(200).json({ days });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Nepodarilo sa načítať voľné termíny' });
  }
};
