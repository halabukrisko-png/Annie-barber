// Odosielanie e-mailov cez Resend (potichu sa preskočí, ak nie je nastavený RESEND_API_KEY / MAIL_FROM).
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function sendMail(to, subject, text, html) {
  if (!process.env.RESEND_API_KEY || !process.env.MAIL_FROM || !to) return false;
  try {
    const body = { from: process.env.MAIL_FROM, to: [].concat(to), subject, text };
    if (html) body.html = html;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!r.ok) console.error('mail', r.status, await r.text().catch(() => ''));
    return r.ok;
  } catch (e) { console.error('mail', e); return false; }
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

const SITE = 'https://barberis-barber-prievidza.com/';
const PHONE = '0951 833 488';
const ADDRESS = 'Hurbana 4, Prievidza';
const TXT = {
  sk: {
    new: { title: 'Termín potvrdený', subject: 'Potvrdenie termínu', hi: 'Ahoj ', intro: 'tvoj termín je potvrdený:', note: 'Ak potrebuješ termín zmeniť alebo zrušiť, môžeš to spraviť na webe:', color: '#1e8e3e' },
    cancel: { title: 'Termín zrušený', subject: 'Zrušenie termínu', hi: 'Ahoj ', intro: 'tvoj termín bol zrušený:', note: 'Nový termín si môžeš rezervovať na webe:', color: '#d93025' },
    rows: ['Termín', 'Služba', 'Barber', 'Adresa'], or: 'alebo zavolaj na', btn: 'Otvoriť web',
  },
  en: {
    new: { title: 'Appointment confirmed', subject: 'Appointment confirmation', hi: 'Hi ', intro: 'your appointment is confirmed:', note: 'If you need to change or cancel your appointment, you can do it on our website:', color: '#1e8e3e' },
    cancel: { title: 'Appointment cancelled', subject: 'Appointment cancelled', hi: 'Hi ', intro: 'your appointment has been cancelled:', note: 'You can book a new appointment on our website:', color: '#d93025' },
    rows: ['Date', 'Service', 'Barber', 'Address'], or: 'or call us at', btn: 'Open website',
  },
};

// E-mail pre zákazníka (potvrdenie / zrušenie) v slovenčine alebo angličtine. d: { name, when, service, barber }
async function mailCustomer(kind, lang, to, d) {
  const L = TXT[lang === 'en' ? 'en' : 'sk'], K = L[kind];
  const rows = [[L.rows[0], d.when], [L.rows[1], d.service], [L.rows[2], d.barber], [L.rows[3], ADDRESS]];
  const text = K.hi + (d.name || '') + ',\n\n' + K.intro + '\n' + rows.map((r) => r[0] + ': ' + r[1]).join('\n') +
    '\n\n' + K.note + '\n' + SITE + '\n' + L.or + ' ' + PHONE + '.\n\nBARBERIS';
  const html = '<div style="font-family:Arial,sans-serif;max-width:480px;color:#111">' +
    '<h2 style="margin:0 0 12px;color:' + K.color + '">' + K.title + '</h2>' +
    '<p style="margin:0 0 12px;font-size:15px">' + esc(K.hi + (d.name || '')) + ',<br>' + K.intro + '</p>' +
    '<table style="border-collapse:collapse;font-size:15px">' +
    rows.map((r, i) => '<tr><td style="padding:4px 12px 4px 0;color:#666">' + r[0] + '</td><td style="padding:4px 0"><b style="color:' +
      (i === 0 ? K.color : '#000') + '">' + esc(r[1]) + '</b></td></tr>').join('') +
    '</table>' +
    '<p style="margin:16px 0 8px;font-size:14px;color:#444">' + K.note + '</p>' +
    '<p style="margin:0 0 16px"><a href="' + SITE + '" style="display:inline-block;background:' + K.color + ';color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:15px">' + L.btn + '</a></p>' +
    '<p style="margin:0 0 4px;font-size:14px;color:#444">' + L.or + ' <b>' + PHONE + '</b></p>' +
    '<p style="margin:12px 0 0;font-size:14px;color:#888">BARBERIS</p></div>';
  // termín v predmete: každý mail je samostatné vlákno, Gmail neskrýva časti ako „quoted text“
  await sendMail(to, K.subject + ' – ' + d.when + ' – BARBERIS', text, html);
}

const VTXT = {
  sk: { subject: 'Potvrď rezerváciu', title: 'Potvrď svoju rezerváciu', hi: 'Ahoj ', intro: 'skoro hotovo. Termín bude rezervovaný až po kliknutí na tlačidlo:', btn: 'Potvrdiť rezerváciu', exp: 'Odkaz platí {m} minút. Ak si rezerváciu nerobil(a) ty, tento e-mail ignoruj.', rows: ['Termín', 'Služba', 'Barber'] },
  en: { subject: 'Confirm your booking', title: 'Confirm your booking', hi: 'Hi ', intro: 'almost done. Your appointment will be booked once you click the button:', btn: 'Confirm booking', exp: 'This link is valid for {m} minutes. If you did not make this booking, just ignore this email.', rows: ['Date', 'Service', 'Barber'] },
};

// Overovací e-mail s odkazom na potvrdenie rezervácie. d: { name, when, service, barber }
async function mailVerify(lang, to, d, link, minutes) {
  const L = VTXT[lang === 'en' ? 'en' : 'sk'], color = '#c9a06a';
  const rows = [[L.rows[0], d.when], [L.rows[1], d.service]].concat(d.barber ? [[L.rows[2], d.barber]] : []);
  const exp = L.exp.replace('{m}', minutes);
  const text = L.hi + (d.name || '') + ',\n\n' + L.intro + '\n' + link + '\n\n' + rows.map((r) => r[0] + ': ' + r[1]).join('\n') + '\n\n' + exp + '\n\nBARBERIS';
  const html = '<div style="font-family:Arial,sans-serif;max-width:480px;color:#111">' +
    '<h2 style="margin:0 0 12px">' + L.title + '</h2>' +
    '<p style="margin:0 0 12px;font-size:15px">' + esc(L.hi + (d.name || '')) + ',<br>' + L.intro + '</p>' +
    '<table style="border-collapse:collapse;font-size:15px">' +
    rows.map((r) => '<tr><td style="padding:4px 12px 4px 0;color:#666">' + r[0] + '</td><td style="padding:4px 0"><b>' + esc(r[1]) + '</b></td></tr>').join('') +
    '</table>' +
    '<p style="margin:18px 0"><a href="' + esc(link) + '" style="display:inline-block;background:' + color + ';color:#141311;text-decoration:none;padding:12px 22px;border-radius:6px;font-size:15px;font-weight:bold">' + L.btn + '</a></p>' +
    '<p style="margin:0 0 4px;font-size:13px;color:#666">' + exp + '</p>' +
    '<p style="margin:12px 0 0;font-size:14px;color:#888">BARBERIS</p></div>';
  return sendMail(to, L.subject + ' – ' + d.when + ' – BARBERIS', text, html);
}

module.exports = { sendMail, notifyOwner, mailCustomer, mailVerify, SITE };
