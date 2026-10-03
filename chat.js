/* BARBERIS chat assistant — a small rule-based FAQ bot (no backend needed).
   Answers only from information that is on the website; anything else is
   handed over to a phone call. Works in SK and EN (follows the site language). */
(function () {
  var PHONE = '0951 833 488';
  var TEL = 'tel:+421951833488';
  var MAPS = 'https://maps.google.com/?q=Hurbana+4,+Prievidza';
  var IG = 'https://www.instagram.com/_barberis._/';
  var BOOK = '/o-nas#booking';

  var HOURS = { 1: [8, 18], 2: [8, 18], 3: [8, 18], 4: [8, 18], 5: [8, 18], 6: [8, 14] };
  function isOpenNow() {
    var n = new Date(), r = HOURS[n.getDay()], h = n.getHours() + n.getMinutes() / 60;
    return !!(r && h >= r[0] && h < r[1]);
  }

  function img(src, alt) {
    return '<img class="bb-img" src="' + src + '" alt="' + alt + '" loading="lazy">';
  }
  function gallery(n) {
    var h = '<div class="bb-grid">';
    for (var i = 1; i <= n; i++) h += img('assets/gallery/gallery-' + i + '-480.webp', 'BARBERIS');
    return h + '</div>';
  }

  // Mini booking calendar shown inside the chat. Picking a day opens the
  // real booking form (o-nas.html) with that day pre-selected; free times come from Google Calendar there.
  function buildCalendar() {
    var wrap = document.createElement('div');
    wrap.className = 'bb-cal';
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var view = new Date(today.getFullYear(), today.getMonth(), 1);
    // today is preselected (when open), so it is immediately clear whether anything is left for it
    var picked = HOURS[today.getDay()] ? new Date(today.getTime()) : null;
    function pad(n) { return n < 10 ? '0' + n : String(n); }
    function draw() {
      var en = lang() === 'en';
      var wd = en ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'] : ['Po', 'Ut', 'St', 'Št', 'Pi', 'So', 'Ne'];
      var html = '<div class="bb-cal-head"><button type="button" data-a="prev" aria-label="' + (en ? 'Previous month' : 'Predchádzajúci mesiac') + '">‹</button><b>' +
        I18N.months()[view.getMonth()] + ' ' + view.getFullYear() + '</b><button type="button" data-a="next" aria-label="' + (en ? 'Next month' : 'Nasledujúci mesiac') + '">›</button></div><div class="bb-cal-grid">';
      wd.forEach(function (d) { html += '<i>' + d + '</i>'; });
      var off = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;
      for (var e = 0; e < off; e++) html += '<span></span>';
      var dim = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
      for (var d = 1; d <= dim; d++) {
        var dt = new Date(view.getFullYear(), view.getMonth(), d);
        var off2 = dt < today || !HOURS[dt.getDay()];
        var sel = picked && picked.getTime() === dt.getTime();
        html += '<button type="button" data-d="' + d + '"' + (off2 ? ' disabled' : '') + ' class="' + (sel ? 'sel ' : '') + (dt.getTime() === today.getTime() ? 'today' : '') + '">' + d + '</button>';
      }
      html += '</div>';
      if (picked) {
        var pd = picked.getFullYear() + '-' + pad(picked.getMonth() + 1) + '-' + pad(picked.getDate());
        html += '<div class="bb-cal-sub">' + I18N.dateShort(picked) + '</div>' +
          '<div class="bb-slots"><a href="/o-nas?d=' + pd + '#booking">' + (en ? 'See free times →' : 'Zobraziť voľné časy →') + '</a></div>' +
          '<div class="bb-cal-note">' + (en ? 'Choose your barber and service to see the exact free times.' : 'Vyber barbera a službu a uvidíš presné voľné časy.') + '</div>';
      }
      wrap.innerHTML = html;
    }
    wrap.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b || b.disabled) return;
      if (b.dataset.a) {
        view.setMonth(view.getMonth() + (b.dataset.a === 'next' ? 1 : -1));
        if (view < new Date(today.getFullYear(), today.getMonth(), 1)) view = new Date(today.getFullYear(), today.getMonth(), 1);
        picked = null;
      } else if (b.dataset.d) {
        picked = new Date(view.getFullYear(), view.getMonth(), +b.dataset.d);
      }
      draw();
      var sub = wrap.querySelector('.bb-slots, .bb-cal-note'); if (sub && sub.scrollIntoView) sub.scrollIntoView({ block: 'nearest' });
    });
    draw();
    return wrap;
  }

  // Each topic: keywords (Slovak + English, diacritics stripped), and per-language answers (HTML).
  var TOPICS = {
    prices: {
      keys: ['cena', 'ceny', 'cenn', 'cenu', 'kolko', 'stoj', 'eur', 'price', 'cost', 'how much', 'fee', 'platb', 'pay'],
      chip: { sk: 'Cenník', en: 'Prices' },
      sk: function () {
        return '<b>Cenník</b><br>Strih – 20 €<br>Strih + brada – 30 €<br>Úprava brady – 15 €<br>Detský strih do 12 r. – 15 €<br>Holenie hlavy + úprava brady – 25 €<br>Farbenie brady – 5 – 10 €<br>Čistenie pleti – od 10 €<br>Ornament – dohodou<br><br>Rezervujte si termín vopred a vyhnite sa čakaniu.';
      },
      en: function () {
        return '<b>Price list</b><br>Haircut – €20<br>Haircut + beard – €30<br>Beard trim – €15<br>Kids’ haircut up to 12 y. – €15<br>Head shave + beard trim – €25<br>Beard coloring – €5 – 10<br>Facial cleansing – from €10<br>Ornament – by agreement<br><br>Book your appointment in advance and skip the wait.';
      }
    },
    hours: {
      keys: ['otvor', 'hodin', 'kedy', 'zatvor', 'open', 'close', 'hours', 'when', 'sobot', 'nedel', 'saturday', 'sunday', 'today', 'dnes', 'time'],
      chip: { sk: 'Otváracie hodiny', en: 'Opening hours' },
      sk: function () {
        return '<b>Otváracie hodiny</b><br>Pondelok – Piatok – 8:00 – 18:00<br>Sobota – 8:00 – 14:00<br>Nedeľa – zatvorené<br><br>' + (isOpenNow() ? 'Práve máme otvorené.' : 'Práve máme zatvorené.');
      },
      en: function () {
        return '<b>Opening hours</b><br>Monday – Friday – 8:00 AM – 6:00 PM<br>Saturday – 8:00 AM – 2:00 PM<br>Sunday – closed<br><br>' + (isOpenNow() ? 'We are open right now.' : 'We are closed right now.');
      }
    },
    booking: {
      keys: ['rezerv', 'objedn', 'termin', 'book', 'appointment', 'reserv', 'order', 'volny', 'available'],
      chip: { sk: 'Rezervovať termín', en: 'Book an appointment' },
      sk: function () {
        return '<b>Termín si môžeš zarezervovať online</b> – vyberieš barbera, službu, dátum a čas a termín ti potvrdíme e-mailom.<br><a href="' + BOOK + '">Zarezervovať termín →</a><br><br>Alebo zavolaj na <a href="' + TEL + '">' + PHONE + '</a>, prípadne nám napíš na <a href="' + IG + '" target="_blank" rel="noopener">Instagram</a>.';
      },
      en: function () {
        return '<b>You can book online</b> — choose a barber, a service, a date and a time, and we will confirm it by e-mail.<br><a href="' + BOOK + '">Book an appointment →</a><br><br>Or call <a href="' + TEL + '">' + PHONE + '</a>, or message us on <a href="' + IG + '" target="_blank" rel="noopener">Instagram</a>.';
      }
    },
    location: {
      keys: ['kde', 'adres', 'ulic', 'prievidz', 'hurban', 'mapa', 'navig', 'where', 'address', 'location', 'map', 'find', 'directions', 'parking', 'parkov'],
      chip: { sk: 'Kde nás nájdeš', en: 'Where to find us' },
      sk: function () {
        return img('assets/storefront-640.webp', 'BARBERIS, Hurbana 4') + '<b>BARBERIS</b><br>Hurbana 4, 971 01 Prievidza<br>V centre Prievidze, pár krokov od námestia.<br><a href="' + MAPS + '" target="_blank" rel="noopener">Navigovať →</a>';
      },
      en: function () {
        return img('assets/storefront-640.webp', 'BARBERIS, Hurbana 4') + '<b>BARBERIS</b><br>Hurbana 4, 971 01 Prievidza<br>In the center of Prievidza, a few steps from the square.<br><a href="' + MAPS + '" target="_blank" rel="noopener">Navigate →</a>';
      }
    },
    services: {
      keys: ['sluzb', 'strih', 'brad', 'ornament', 'holen', 'farb', 'plet', 'service', 'haircut', 'beard', 'shave', 'kids', 'child', 'detsk', 'offer', 'ponuk'],
      chip: { sk: 'Služby', en: 'Services' },
      sk: function () {
        return '<b>Ponúkame</b> pánsky strih, úpravu brady, kompletný balík strih + brada, ornamentálne strihy, detský strih do 12 rokov, holenie hlavy, farbenie brady a čistenie pleti.<br><a href="index.html#services">Pozrieť služby →</a>';
      },
      en: function () {
        return 'We <b>offer</b> men’s haircuts, beard trims, the complete haircut + beard package, ornamental cuts, kids’ haircuts up to 12 years, head shaves, beard coloring and facial cleansing.<br><a href="index.html#services">See services →</a>';
      }
    },
    team: {
      keys: ['tim', 'barber', 'anett', 'karvy', 'vladis', 'team', 'who', 'kto', 'zakladat', 'founder'],
      chip: { sk: 'Náš tím', en: 'Our team' },
      sk: function () {
        return img('assets/hero-team-640.webp', 'Anett, Karvy, Vladis') + '<b>Anett</b> – zakladateľka, barbering robí takmer 7 rokov.<br><b>Karvy</b> – 6 rokov skúseností, špecialista na ornamentálne strihy a jeden z našich showmanov.<br><b>Vladis</b> – 4 roky skúseností, precízna práca a pohodová atmosféra.<br><a href="index.html#team">Spoznať tím →</a>';
      },
      en: function () {
        return img('assets/hero-team-640.webp', 'Anett, Karvy, Vladis') + '<b>Anett</b> – founder, barbering for almost 7 years.<br><b>Karvy</b> – 6 years of experience, ornamental cuts specialist and one of our showmen.<br><b>Vladis</b> – 4 years of experience, precise work and a relaxed atmosphere.<br><a href="index.html#team">Meet the team →</a>';
      }
    },
    change: {
      keys: ['zrus', 'zmen', 'presun', 'cancel', 'change', 'reschedul', 'move'],
      chip: { sk: 'Zrušiť termín', en: 'Cancel appointment' },
      sk: function () {
        return 'Termín zmeníš alebo zrušíš najjednoduchšie telefonicky – radi ti nájdeme nový čas.<br><a href="' + TEL + '">Zavolať ' + PHONE + '</a>';
      },
      en: function () {
        return 'The easiest way to change or cancel is by phone — we will gladly find you a new time.<br><a href="' + TEL + '">Call ' + PHONE + '</a>';
      }
    },
    contact: {
      keys: ['kontakt', 'telef', 'cislo', 'zavol', 'napis', 'instagram', 'facebook', 'mail', 'contact', 'phone', 'call', 'number', 'message', 'dm'],
      chip: { sk: 'Kontakt', en: 'Contact' },
      sk: function () {
        return 'Zavolaj: <a href="' + TEL + '">' + PHONE + '</a><br>Instagram: <a href="' + IG + '" target="_blank" rel="noopener">@_barberis._</a><br>Facebook: <a href="https://www.facebook.com/p/BARBERIS-100077906015748/" target="_blank" rel="noopener">Barberis</a>';
      },
      en: function () {
        return 'Call: <a href="' + TEL + '">' + PHONE + '</a><br>Instagram: <a href="' + IG + '" target="_blank" rel="noopener">@_barberis._</a><br>Facebook: <a href="https://www.facebook.com/p/BARBERIS-100077906015748/" target="_blank" rel="noopener">Barberis</a>';
      }
    },
    kids: {
      keys: ['detsk', 'kids', 'child', 'dieta', 'deti'],
      chip: { sk: 'Detský strih', en: 'Kids’ haircut' },
      sk: function () { return '<b>Detský strih do 12 rokov</b> – 15 €.<br><a href="' + BOOK + '">Zarezervovať termín →</a>'; },
      en: function () { return '<b>Kids’ haircut up to 12 years</b> – €15.<br><a href="' + BOOK + '">Book an appointment →</a>'; }
    },
    beard: {
      keys: ['brad', 'beard', 'holen', 'shave', 'farben', 'coloring', 'colouring'],
      chip: { sk: 'Brada', en: 'Beard' },
      sk: function () { return '<b>Úprava brady</b> – 15 € (tvarovanie, kontúry a finálna úprava)<br><b>Strih + brada</b> – 30 €<br><b>Holenie hlavy + úprava brady</b> – 25 €<br><b>Farbenie brady</b> – 5 – 10 €'; },
      en: function () { return '<b>Beard trim</b> – €15 (shaping, contours and final finish)<br><b>Haircut + beard</b> – €30<br><b>Head shave + beard trim</b> – €25<br><b>Beard coloring</b> – €5 – 10'; }
    },
    ornament: {
      keys: ['ornament', 'kreativ', 'creative', 'design', 'vzor'],
      chip: { sk: 'Ornament', en: 'Ornament' },
      sk: function () { return img('assets/gallery/gallery-2-480.webp', 'Ornament') + '<b>Ornament</b> – kreatívny detail vytvorený presne podľa tvojho želania, cena dohodou. Ornamentálne strihy sú špecialitou Karvyho.'; },
      en: function () { return img('assets/gallery/gallery-2-480.webp', 'Ornament') + '<b>Ornament</b> – a creative detail made exactly to your wishes, price by agreement. Ornamental cuts are Karvy’s specialty.'; }
    },
    skin: {
      keys: ['plet', 'facial', 'skin', 'pokozk'],
      chip: { sk: 'Čistenie pleti', en: 'Facial cleansing' },
      sk: function () { return '<b>Čistenie pleti</b> – od 10 €.'; },
      en: function () { return '<b>Facial cleansing</b> – from €10.'; }
    },
    includes: {
      keys: ['zahrn', 'obsahuj', 'include', 'styling', 'wash', 'umyt', 'oboc', 'eyebrow'],
      chip: { sk: 'Čo zahŕňa strih', en: 'What’s included' },
      sk: function () { return 'Rezervujte si termín vopred a vyhnite sa čakaniu. ✂️'; },
      en: function () { return 'Book your appointment in advance and skip the wait. ✂️'; }
    },
    anett: {
      keys: ['anett', 'annet', 'zakladat', 'founder'],
      sk: function () { return img('assets/anett-480.webp', 'Anett') + '<b>Anett</b> – zakladateľka BARBERIS. Barberingu sa venuje takmer 7 rokov a najviac ju baví práca s ľuďmi.<br><a href="' + BOOK + '">Objednať sa →</a>'; },
      en: function () { return img('assets/anett-480.webp', 'Anett') + '<b>Anett</b> – founder of BARBERIS. She has been barbering for almost 7 years and enjoys working with people the most.<br><a href="' + BOOK + '">Book now →</a>'; }
    },
    karvy: {
      keys: ['karvy', 'karvi'],
      sk: function () { return img('assets/karvy-480.webp', 'Karvy') + '<b>Karvy</b> – barber s 6 rokmi skúseností, špecialista na ornamentálnu tvorbu a jeden z našich showmanov. Vie postarať o dobrú náladu v kresle. 😄<br><a href="' + BOOK + '">Objednať sa →</a>'; },
      en: function () { return img('assets/karvy-480.webp', 'Karvy') + '<b>Karvy</b> – a barber with 6 years of experience, an ornamental work specialist and one of our showmen. He knows how to keep the mood good in the chair. 😄<br><a href="' + BOOK + '">Book now →</a>'; }
    },
    vladis: {
      keys: ['vladis'],
      sk: function () { return img('assets/vladis-480.webp', 'Vladis') + '<b>Vladis</b> – barber so 4 rokmi skúseností. Dbá na kvalitnú, precíznu prácu a spokojného zákazníka.<br><a href="' + BOOK + '">Objednať sa →</a>'; },
      en: function () { return img('assets/vladis-480.webp', 'Vladis') + '<b>Vladis</b> – a barber with 4 years of experience. He cares about quality, precise work and a satisfied customer.<br><a href="' + BOOK + '">Book now →</a>'; }
    },
    cosmetics: {
      keys: ['kozmet', 'cosmetic', 'produkt', 'product', 'vosk', 'wax'],
      chip: { sk: 'Kozmetika', en: 'Cosmetics' },
      sk: function () { return 'Používame kvalitnú profesionálnu kozmetiku, ktorú starostlivo vyberáme s dôrazom na zdravie vlasov, pokožky a brady.'; },
      en: function () { return 'We use quality professional cosmetics, carefully chosen with an emphasis on the health of hair, skin and beard.'; }
    },
    atmosphere: {
      keys: ['atmosfer', 'atmosphere', 'vibe', 'kava', 'coffee', 'pokec'],
      chip: { sk: 'Atmosféra', en: 'Atmosphere' },
      sk: function () { return 'U nás si vyberieš, na čo máš náladu – pokec, srandu alebo jednoducho pokoj. My sa postaráme o strih. 😄<br><a href="/o-nas">O nás →</a>'; },
      en: function () { return 'With us you choose the mood — a chat, some fun or simply peace. We take care of the haircut. 😄<br><a href="/o-nas">About us →</a>'; }
    },
    booknew: {
      keys: [],
      chip: { sk: 'Rezervovať nový termín', en: 'Book a new appointment' },
      sk: function () { return TOPICS.booking.sk(); },
      en: function () { return TOPICS.booking.en(); }
    },
    gallery: {
      keys: ['galeri', 'gallery', 'foto', 'photo', 'obrazk', 'picture', 'ukazk'],
      chip: { sk: 'Galéria', en: 'Gallery' },
      sk: function () { return gallery(4) + 'Pár ukážok z našej práce a priestoru.<br><a href="/galeria">Celá galéria →</a>'; },
      en: function () { return gallery(4) + 'A few samples of our work and space.<br><a href="/galeria">Full gallery →</a>'; }
    },
    calendar: {
      keys: ['kalendar', 'calendar', 'volne terminy', 'available'],
      chip: { sk: 'Vybrať dátum', en: 'Pick a date' },
      sk: function () { return buildCalendar(); },
      en: function () { return buildCalendar(); }
    },
    about: {
      keys: ['o nas', 'about us', 'o vas', 'pribeh', 'story'],
      chip: { sk: 'O nás', en: 'About us' },
      sk: function () { return img('assets/lounge-640.webp', 'BARBERIS') + '<b>Dobrý strih. Dobrá atmosféra. Tvoje tempo.</b><br>Nie každý prichádza do barberu na hodinový pokec – u nás si vyberieš, či chceš pokec, srandu alebo jednoducho pokoj.<br>Nájdeš nás v centre Prievidze na adrese <b>Hurbana 4, 971 01 Prievidza</b>.<br><a href="/o-nas">O nás →</a>'; },
      en: function () { return img('assets/lounge-640.webp', 'BARBERIS') + '<b>Good haircut. Good vibes. Your pace.</b><br>Not everyone comes to the barber for an hour-long chat — with us you choose whether you want a chat, some fun or simply peace.<br>You will find us in the center of Prievidza at <b>Hurbana 4, 971 01 Prievidza</b>.<br><a href="/o-nas">About us →</a>'; }
    },
    hello: {
      keys: ['ahoj', 'cau', 'dobry den', 'zdravim', 'hello', 'hi', 'hey', 'good morning', 'good evening'],
      sk: function () { return 'Ahoj! 👋 S čím ti môžem pomôcť?'; },
      en: function () { return 'Hi! 👋 How can I help you?'; }
    },
    thanks: {
      keys: ['dakuj', 'vdaka', 'thanks', 'thank', 'super', 'great'],
      sk: function () { return 'Rado sa stalo! Tešíme sa na teba v kresle. 💈'; },
      en: function () { return 'You are welcome! We look forward to seeing you in the chair. 💈'; }
    }
  };
  var ORDER = ['change', 'calendar', 'gallery', 'about', 'kids', 'ornament', 'beard', 'skin', 'includes', 'anett', 'karvy', 'vladis', 'cosmetics', 'atmosphere', 'booking', 'prices', 'hours', 'location', 'team', 'contact', 'services', 'hello', 'thanks'];
  // Hierarchical quick-reply menus: 'about' and 'services' open a submenu with a Back button.
  var MENUS = {
    main: ['booking', 'about', 'services', 'hours', 'location', 'contact', 'change'],
    booking: ['calendar', 'change', '_back'],
    change: ['booknew', '_back'],
    hours: ['booking', 'location', '_back'],
    location: ['hours', 'contact', '_back'],
    contact: ['booking', 'location', '_back'],
    about: ['team', 'gallery', '_back'],
    services: ['prices', '_back']
  };
  var SUBMENU = { calendar: 'booking', gallery: 'about', hours: 'hours', location: 'location', contact: 'contact', booking: 'booking', booknew: 'booking', change: 'change', about: 'about', services: 'services' };
  var BACK = { sk: '← Späť', en: '← Back' };
  var BACK_MSG = { sk: 'Ahoj! 👋 S čím ti môžem pomôcť?', en: 'Hi! 👋 How can I help you?' };

  var UI = {
    sk: {
      title: 'BARBERIS asistent', sub: 'Odpovedá na časté otázky', open: 'Otvoriť chat', close: 'Zavrieť chat',
      placeholder: 'Napíš otázku…', send: 'Odoslať',
      hello: 'Ahoj! 👋 Som asistent BARBERIS. Spýtaj sa na cenník, otváracie hodiny, rezerváciu alebo kde nás nájdeš.',
      fallback: 'Toto bohužiaľ neviem. Najlepšie nám zavolaj na <a href="' + TEL + '">' + PHONE + '</a> alebo napíš na <a href="' + IG + '" target="_blank" rel="noopener">Instagram</a> – radi ti odpovieme.'
    },
    en: {
      title: 'BARBERIS assistant', sub: 'Answers common questions', open: 'Open chat', close: 'Close chat',
      placeholder: 'Type your question…', send: 'Send',
      hello: 'Hi! 👋 I am the BARBERIS assistant. Ask me about prices, opening hours, booking or where to find us.',
      fallback: 'Sorry, I don’t know that one. Please call us on <a href="' + TEL + '">' + PHONE + '</a> or message us on <a href="' + IG + '" target="_blank" rel="noopener">Instagram</a> — we will gladly answer.'
    }
  };

  function lang() { return (window.LANG && window.LANG()) === 'en' ? 'en' : 'sk'; }
  function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function findTopic(text) {
    var q = ' ' + norm(text).replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ') + ' ';
    for (var i = 0; i < ORDER.length; i++) {
      var t = TOPICS[ORDER[i]];
      for (var k = 0; k < t.keys.length; k++) {
        var key = t.keys[k];
        // short keys must match a whole word, longer ones as a prefix of a word
        var hit = key.length <= 3 ? q.indexOf(' ' + key + ' ') !== -1 : q.indexOf(' ' + key) !== -1;
        if (hit) return ORDER[i];
      }
    }
    return null;
  }

  var css =
    '#bb-chat-btn{position:fixed;right:12px;bottom:12px;z-index:30;width:38px;height:38px;border-radius:50%;border:none;background:linear-gradient(145deg,#dcb883,#b98d55);color:#141311;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(0,0,0,0.45),inset 0 1px 0 rgba(255,255,255,0.35);}' +
    '#bb-chat-btn svg{width:17px;height:17px;}' +
    '#bb-chat{position:fixed;right:12px;bottom:58px;z-index:30;width:min(256px,calc(100vw - 24px));height:min(360px,calc(100vh - 84px));display:flex;flex-direction:column;visibility:hidden;opacity:0;pointer-events:none;transform:translateY(14px) scale(.94);transform-origin:bottom right;transition:opacity .28s ease,transform .38s cubic-bezier(.22,1,.36,1),visibility 0s linear .38s;background:rgba(26,24,21,0.94);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#f4ede1;border:1px solid rgba(201,160,106,0.22);border-radius:14px;box-shadow:0 14px 40px rgba(0,0,0,0.6);overflow:hidden;font-family:"Work Sans",sans-serif;}' +
    '#bb-chat.open{visibility:visible;opacity:1;pointer-events:auto;transform:none;transition:opacity .28s ease,transform .38s cubic-bezier(.22,1,.36,1),visibility 0s;}' +
    '#bb-chat header{display:flex;align-items:center;justify-content:space-between;padding:8px 10px 8px 12px;border-bottom:1px solid rgba(244,237,225,0.07);background:linear-gradient(180deg,rgba(201,160,106,0.14),rgba(201,160,106,0));}' +
    '#bb-chat header b{display:block;font-family:"Fraunces",serif;font-size:12px;letter-spacing:0.03em;}' +
    '#bb-chat header span{display:flex;align-items:center;gap:5px;font-size:9.5px;color:rgba(244,237,225,0.55);}#bb-chat header span::before{content:"";width:5px;height:5px;border-radius:50%;background:#6fbf73;}' +
    '#bb-chat header>button{background:none;border:none;color:rgba(244,237,225,0.7);font-size:18px;line-height:1;cursor:pointer;width:22px;height:22px;border-radius:50%;padding:0;transition:background .2s ease;}#bb-chat header>button:hover{background:rgba(244,237,225,0.1);}' +
    '.bb-m.cal{width:100%;max-width:100%;padding:8px;}' +
    '.bb-img{display:block;width:100%;height:auto;max-height:230px;object-fit:contain;background:rgba(0,0,0,0.25);border-radius:8px;margin-bottom:6px;}' +
    '.bb-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:6px;}.bb-grid .bb-img{margin:0;aspect-ratio:1;max-height:none;object-fit:cover;border-radius:6px;}' +
    '.bb-cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;font-size:11.5px;color:#f4ede1;}' +
    '.bb-cal-head button{background:none;border:none;color:#c9a06a;font-size:16px;line-height:1;cursor:pointer;width:22px;height:22px;border-radius:50%;padding:0;}.bb-cal-head button:hover{background:rgba(244,237,225,0.1);}' +
    '.bb-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;}' +
    '.bb-cal-grid i{font-style:normal;font-size:9px;color:rgba(244,237,225,0.45);padding-bottom:2px;}' +
    '.bb-cal-grid button{background:none;border:1px solid transparent;color:#f4ede1;font:inherit;font-size:11px;height:24px;border-radius:6px;cursor:pointer;padding:0;}' +
    '.bb-cal-grid button:hover:not(:disabled){background:rgba(201,160,106,0.2);}' +
    '.bb-cal-grid button:disabled{color:rgba(244,237,225,0.22);cursor:default;}' +
    '.bb-cal-grid button.today{border-color:rgba(201,160,106,0.55);}' +
    '.bb-cal-grid button.sel{background:#c9a06a;color:#141311;font-weight:700;}' +
    '.bb-cal-sub{margin:8px 0 4px;font-size:11px;color:#f4ede1;font-weight:600;}' +
    '.bb-slots{display:flex;flex-wrap:wrap;gap:4px;}' +
    '.bb-slots a{border:1px solid rgba(201,160,106,0.55);color:#c9a06a;border-radius:999px;padding:3px 8px;font-size:10.5px;text-decoration:none;}.bb-slots a:hover{background:#c9a06a;color:#141311;}' +
    '.bb-cal-note{margin-top:6px;font-size:10px;color:rgba(244,237,225,0.55);}.bb-cal-note.none{font-size:11px;line-height:1.45;color:#f4ede1;text-align:center;padding:8px;border:1px dashed rgba(201,160,106,0.55);border-radius:8px;background:rgba(201,160,106,0.07);}' +
    '#bb-lang{margin-left:auto;margin-right:6px;}#bb-lang .lang-switch button{padding:2px 5px;font-size:10px;}#bb-msgs{flex:1;overflow-y:auto;padding:10px;display:flex;flex-direction:column;gap:5px;scrollbar-width:thin;scrollbar-color:rgba(201,160,106,0.3) transparent;}' +
    '.bb-m{max-width:90%;padding:6px 10px;border-radius:12px;font-size:11.5px;line-height:1.45;}' +
    '.bb-m a{color:#c9a06a;text-decoration:underline;}' +
    '.bb-m.bot{background:#241f1a;color:#cfc6b8;align-self:flex-start;border-bottom-left-radius:4px;}' +
    '.bb-m.me{background:linear-gradient(145deg,#dcb883,#c9a06a);color:#141311;align-self:flex-end;border-bottom-right-radius:4px;}' +
    '#bb-chips{display:flex;flex-wrap:wrap;gap:4px;padding:0 10px 8px;flex:0 0 auto;}' +
    '#bb-chips button{background:none;border:1px solid rgba(201,160,106,0.55);color:#c9a06a;border-radius:999px;padding:3px 8px;font:inherit;font-size:10px;cursor:pointer;}' +
    '#bb-form{display:flex;gap:5px;padding:7px;border-top:1px solid rgba(244,237,225,0.07);}' +
    '#bb-form input{flex:1;min-width:0;background:rgba(244,237,225,0.05);border:1px solid rgba(244,237,225,0.1);border-radius:999px;color:#f4ede1;padding:6px 11px;font:inherit;font-size:16px;outline:none;transition:border-color .2s ease;}#bb-form input:focus{border-color:rgba(201,160,106,0.6);}' +
    '#bb-form button{flex:0 0 auto;width:30px;height:30px;align-self:center;background:linear-gradient(145deg,#dcb883,#c9a06a);color:#141311;border:none;border-radius:50%;padding:0;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .2s ease;}#bb-form button:hover{transform:scale(1.08);}#bb-form button svg{width:14px;height:14px;}' +
    '#bb-chat-btn{transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s ease;}' +
    '#bb-chat-btn:hover{transform:scale(1.07);box-shadow:0 8px 26px rgba(0,0,0,0.5);}' +
    '#bb-chat-btn:active{transform:scale(.94);}' +
    '#bb-chat-btn .ic{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:transform .35s cubic-bezier(.22,1,.36,1),opacity .25s ease;}' +
    '#bb-chat-btn .ic-x{opacity:0;transform:rotate(-90deg) scale(.5);}' +
    '#bb-chat-btn.open .ic-chat{opacity:0;transform:rotate(90deg) scale(.5);}' +
    '#bb-chat-btn.open .ic-x{opacity:1;transform:none;}' +
    '#bb-chat-btn::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #c9a06a;opacity:0;pointer-events:none;}' +
    '.bb-m.bot.typing{display:flex;gap:4px;align-items:center;padding:10px 12px;}' +
    '.bb-m.typing i{width:5px;height:5px;border-radius:50%;background:#c9a06a;opacity:.45;}' +
    '@media (prefers-reduced-motion:no-preference){' +
      '#bb-chat-btn{animation:bbPop .6s cubic-bezier(.34,1.56,.64,1) 1.2s both;}' +
      '#bb-chat-btn.attn::after{animation:bbRing 1.6s ease-out 2s 2 both;}' +
      '.bb-m{animation:bbMsg .42s cubic-bezier(.22,1,.36,1) both;}' +
      '.bb-m.me{transform-origin:bottom right;}.bb-m.bot{transform-origin:bottom left;}' +
      '.bb-m.typing i{animation:bbDot 1s ease-in-out infinite;}' +
      '.bb-m.typing i:nth-child(2){animation-delay:.15s;}.bb-m.typing i:nth-child(3){animation-delay:.3s;}' +
      '#bb-chips button{animation:bbChip .45s cubic-bezier(.22,1,.36,1) both;transition:background .2s ease,color .2s ease,transform .2s ease;}' +
      '#bb-chips button:hover{background:#c9a06a;color:#141311;transform:translateY(-1px);}' +
      '@keyframes bbPop{from{opacity:0;transform:scale(.3) translateY(20px);}to{opacity:1;transform:none;}}' +
      '@keyframes bbRing{0%{opacity:.7;transform:scale(1);}70%,100%{opacity:0;transform:scale(1.7);}}' +
      '@keyframes bbMsg{from{opacity:0;transform:translateY(10px) scale(.94);}to{opacity:1;transform:none;}}' +
      '@keyframes bbDot{0%,60%,100%{transform:translateY(0);opacity:.4;}30%{transform:translateY(-4px);opacity:1;}}' +
      '@keyframes bbChip{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}' +
    '}';

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    var btn = document.createElement('button');
    btn.id = 'bb-chat-btn';
    btn.type = 'button';
    btn.classList.add('attn');
    btn.innerHTML = '<span class="ic ic-chat"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/></svg></span><span class="ic ic-x"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg></span>';

    var box = document.createElement('div');
    box.id = 'bb-chat';
    box.setAttribute('role', 'dialog');
    box.innerHTML =
      '<header><div><b id="bb-title"></b><span id="bb-sub"></span></div><div id="bb-lang"></div><button type="button" id="bb-x">&times;</button></header>' +
      '<div id="bb-msgs" aria-live="polite"></div><div id="bb-chips"></div>' +
      '<form id="bb-form" autocomplete="off"><input id="bb-input" type="text" maxlength="200"><button type="submit" id="bb-send"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>';
    document.body.appendChild(box);
    document.body.appendChild(btn);

    if (window.I18N && I18N.makeSwitch) box.querySelector('#bb-lang').appendChild(I18N.makeSwitch('margin-left:auto;'));
    var msgs = box.querySelector('#bb-msgs');
    // Scrolling: a new message is scrolled into view (its top, if it is long) only until the
    // user scrolls by hand — after that the view stays exactly where they left it.
    var follow = true, last = null;
    function reveal() {
      if (!follow || !last) return;
      msgs.scrollTop = Math.min(msgs.scrollHeight - msgs.clientHeight, last.offsetTop - msgs.offsetTop - 8);
    }
    ['wheel', 'touchmove', 'mousedown'].forEach(function (ev) {
      msgs.addEventListener(ev, function () { follow = false; }, { passive: true });
    });
    msgs.addEventListener('load', reveal, true);
    var chips = box.querySelector('#bb-chips');
    var input = box.querySelector('#bb-input');
    var started = false;
    var menu = 'main';

    function add(html, who) {
      var d = document.createElement('div');
      d.className = 'bb-m ' + who;
      if (who === 'me') d.textContent = html;
      else if (typeof html === 'string') d.innerHTML = html;
      else { d.classList.add('cal'); d.appendChild(html); }
      msgs.appendChild(d);
      follow = true;
      last = d;
      reveal();
    }
    function reply(id) {
      var l = lang();
      var html = id ? TOPICS[id][l]() : UI[l].fallback;
      var size = typeof html === 'string' ? html.length : 200;
      var dots = document.createElement('div');
      dots.className = 'bb-m bot typing';
      dots.innerHTML = '<i></i><i></i><i></i>';
      msgs.appendChild(dots);
      follow = true;
      last = dots;
      reveal();
      var wait = Math.min(1100, 450 + size * 1.2);
      setTimeout(function () {
        if (dots.parentNode) dots.parentNode.removeChild(dots);
        add(html, 'bot');
      }, wait);
    }
    function renderChrome() {
      var l = lang();
      box.setAttribute('aria-label', UI[l].title);
      box.querySelector('#bb-title').textContent = UI[l].title;
      box.querySelector('#bb-sub').textContent = UI[l].sub;
      btn.setAttribute('aria-label', UI[l].open);
      box.querySelector('#bb-x').setAttribute('aria-label', UI[l].close);
      input.placeholder = UI[l].placeholder;
      box.querySelector('#bb-send').setAttribute('aria-label', UI[l].send);
      chips.innerHTML = '';
      MENUS[menu].forEach(function (id) {
        var c = document.createElement('button');
        c.type = 'button';
        if (id === '_back') {
          c.textContent = BACK[l];
          c.addEventListener('click', function () {
            menu = 'main';
            var lg = lang();
            add(BACK[lg].replace('← ', ''), 'me');
            setTimeout(function () { add(BACK_MSG[lg], 'bot'); }, 250);
            renderChrome();
          });
        } else {
          c.textContent = TOPICS[id].chip[l];
          c.addEventListener('click', function () {
            add(TOPICS[id].chip[lang()], 'me');
            reply(id);
            if (SUBMENU[id]) { menu = SUBMENU[id]; renderChrome(); }
          });
        }
        c.style.animationDelay = (0.2 + chips.children.length * 0.06) + 's';
        chips.appendChild(c);
      });
    }
    function toggle(open) {
      box.classList.toggle('open', open);
      btn.classList.toggle('open', open);
      btn.classList.remove('attn');
      if (open) {
        if (!started) { started = true; add(UI[lang()].hello, 'bot'); }
        input.focus();
      }
    }

    btn.addEventListener('click', function () { toggle(!box.classList.contains('open')); });
    box.querySelector('#bb-x').addEventListener('click', function () { toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
    box.querySelector('#bb-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      if (!v) return;
      add(v, 'me');
      input.value = '';
      reply(findTopic(v));
    });
    window.addEventListener('langchange', function () {
      renderChrome();
      msgs.innerHTML = '';
      if (started) add(UI[lang()].hello, 'bot');
    });
    renderChrome();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
