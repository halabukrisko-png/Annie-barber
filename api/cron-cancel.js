// GET /api/cron-cancel – volá sa každých pár minút (GitHub Actions, viď .github/workflows/cancel-check.yml).
// Nájde termíny zmazané ručne v Google Kalendári barbera a pošle zákazníkovi aj majiteľovi e-mail o zrušení.
// Dedupe: kópia termínu v spoločnom kalendári (CAL_SHARED) = „zákazník ešte nevie“. Po odoslaní sa kópia zmaže;
// /api/cancel ju maže pred zrušením termínu, takže zrušenia cez web sa neoznamujú dvakrát.
const { SERVICES, BARBER_NAMES, HORIZON_DAYS, calendarId } = require('./_lib/config');
const { todayStr, minuteOfDay, hhmm } = require('./_lib/time');
const { listEvents, deleteEvent, listChanged } = require('./_lib/google');
const { mailCustomer, notifyOwner } = require('./_lib/mail');

const LOOKBACK_MS = 24 * 3600 * 1000; // aj po výpadku cronu sa dobehnú zrušenia z posledného dňa

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== 'Bearer ' + secret) return res.status(401).json({ error: 'Unauthorized' });
  const shared = process.env.CAL_SHARED;
  if (!shared) return res.status(503).json({ error: 'CAL_SHARED nie je nastavený' });
  try {
    const now = Date.now();
    const sent = [];
    for (const barber of BARBER_NAMES) {
      const cal = calendarId(barber);
      if (!cal) continue;
      const changed = await listChanged(cal, now - LOOKBACK_MS, '&fields=items(id,status)');
      for (const ev of (changed.items || [])) {
        if (ev.status !== 'cancelled') continue;
        const m = await listEvents(shared, now - LOOKBACK_MS, now + (HORIZON_DAYS + 5) * 86400000,
          '&privateExtendedProperty=' + encodeURIComponent('source=' + ev.id));
        const mirrors = (m.items || []).filter((e) => e.start && e.start.dateTime);
        for (const mir of mirrors) {
          await deleteEvent(shared, mir.id); // najprv dedupe značka, až potom e-mail
          const startMs = Date.parse(mir.start.dateTime);
          if (Date.parse(mir.end.dateTime) < now) continue; // zmazaný už odbehnutý termín (upratovanie) neoznamujeme
          const pr = (mir.extendedProperties && mir.extendedProperties.private) || {};
          const desc = mir.description || '';
          const name = (desc.match(/Zákazník:\s*(.+)/) || [])[1] || '';
          const email = (desc.match(/E-mail:\s*(\S+)/) || [])[1] || '';
          const svc = SERVICES[pr.service];
          const lang = pr.lang === 'en' ? 'en' : 'sk';
          const date = todayStr(startMs), time = hhmm(minuteOfDay(startMs));
          const dmy = date.split('-').reverse().join('. ');
          const when = dmy + ' o ' + time;
          const service = svc ? svc.name : '';
          if (email) {
            await mailCustomer('cancel', lang, email, { name, barber, service: lang === 'en' && svc ? (svc.nameEn || svc.name) : service,
              when: lang === 'en' ? dmy + ' at ' + time : when });
          }
          await notifyOwner('cancel', { when, service, barber, name, phone: pr.phone || '', email });
          sent.push({ barber, when });
        }
      }
    }
    return res.status(200).json({ ok: true, notified: sent.length });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'cron-cancel failed' });
  }
};
