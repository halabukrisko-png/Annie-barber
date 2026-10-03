// Odosielanie e-mailov cez Resend (potichu sa preskočí, ak nie je nastavený RESEND_API_KEY / MAIL_FROM).
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function sendMail(to, subject, text, html) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM || !to) return;
  try {
    const body = { from: process.env.MAIL_FROM, to: [].concat(to), subject, text };
    if (html) body.html = html;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) console.error('mail', r.status, await r.text().catch(() => ''));
  } catch (e) { console.error('mail', e); }
}

// Oznam pre majiteľa: zelený = nová rezervácia, červený = zrušenie. Posiela sa na OWNER_EMAIL.
async function notifyOwner(kind, d) {
  const to = process.env.OWNER_EMAIL;
  if (!to) return;
  const ok = kind === 'new';
  const color = ok ? '#1e8e3e' : '#d93025';
  const title = ok ? 'Nová rezervácia' : 'Zrušený termín';
  const rows = [['Termín', d.when], ['Služba', d.service], ['Barber', d.barber], ['Zákazník', d.name],
    ['Telefón', d.phone], ['E-mail', d.email]].filter((r) => r[1]);
  const text = title + '\n' + rows.map((r) => r[0] + ': ' + r[1]).join('\n');
  const html = '<div style="font-family:Arial,sans-serif;max-width:480px">' +
    '<h2 style="margin:0 0 12px;color:' + color + '">' + title + '</h2>' +
    '<table style="border-collapse:collapse;font-size:15px">' +
    rows.map((r) => '<tr><td style="padding:4px 12px 4px 0;color:#666">' + r[0] + '</td><td style="padding:4px 0"><b style="color:' +
      (r[0] === 'Termín' ? color : '#000') + '">' + esc(r[1]) + '</b></td></tr>').join('') +
    '</table></div>';
  await sendMail(to.split(',').map((s) => s.trim()).filter(Boolean), (ok ? '🟢 ' : '🔴 ') + title + ' – ' + d.name + ', ' + d.when, text, html);
}

module.exports = { sendMail, notifyOwner };
