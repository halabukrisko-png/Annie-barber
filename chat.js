/* BARBERIS chat assistant — a small rule-based FAQ bot (no backend needed).
   Answers only from information that is on the website; anything else is
   handed over to a phone call. Works in SK and EN (follows the site language). */
(function () {
  var PHONE = '0910 123 456';
  var TEL = 'tel:+421910123456';
  var MAPS = 'https://maps.google.com/?q=Hurbana+4,+Prievidza';
  var IG = 'https://instagram.com/barberis';
  var BOOK = 'o-nas.html#booking';

  var HOURS = { 2: [9, 18], 3: [9, 18], 4: [9, 18], 5: [9, 18], 6: [9, 13] };
  function isOpenNow() {
    var n = new Date(), r = HOURS[n.getDay()], h = n.getHours() + n.getMinutes() / 60;
    return !!(r && h >= r[0] && h < r[1]);
  }

  // Each topic: keywords (Slovak + English, diacritics stripped), and per-language answers (HTML).
  var TOPICS = {
    prices: {
      keys: ['cena', 'ceny', 'cenn', 'cenu', 'kolko', 'stoj', 'eur', 'price', 'cost', 'how much', 'fee', 'platb', 'pay'],
      chip: { sk: 'Cenník', en: 'Prices' },
      sk: function () {
        return '<b>Cenník</b><br>Strih – 20 €<br>Fade – 20 €<br>Strih + brada – 30 €<br>Úprava brady – 15 €<br>Detský strih do 12 r. – 15 €<br>Holenie hlavy + úprava brady – 25 €<br>Farbenie brady – 5 – 10 €<br>Čistenie pleti – od 10 €<br>Ornament – dohodou<br><br>Každý strih zahŕňa umytie vlasov, úpravu obočia, depiláciu nosa a uší a záverečný styling.';
      },
      en: function () {
        return '<b>Price list</b><br>Haircut – €20<br>Fade – €20<br>Haircut + beard – €30<br>Beard trim – €15<br>Kids’ haircut up to 12 y. – €15<br>Head shave + beard trim – €25<br>Beard coloring – €5 – 10<br>Facial cleansing – from €10<br>Ornament – by agreement<br><br>Every haircut includes hair wash, eyebrow shaping, nose and ear hair removal and final styling.';
      }
    },
    hours: {
      keys: ['otvor', 'hodin', 'kedy', 'zatvor', 'open', 'close', 'hours', 'when', 'sobot', 'nedel', 'saturday', 'sunday', 'today', 'dnes', 'time'],
      chip: { sk: 'Otváracie hodiny', en: 'Opening hours' },
      sk: function () {
        return '<b>Otváracie hodiny</b><br>Pondelok – zatvorené<br>Utorok – Piatok – 9:00 – 18:00<br>Sobota – 9:00 – 13:00<br>Nedeľa – zatvorené<br><br>' + (isOpenNow() ? 'Práve máme otvorené.' : 'Práve máme zatvorené.');
      },
      en: function () {
        return '<b>Opening hours</b><br>Monday – closed<br>Tuesday – Friday – 9:00 AM – 6:00 PM<br>Saturday – 9:00 AM – 1:00 PM<br>Sunday – closed<br><br>' + (isOpenNow() ? 'We are open right now.' : 'We are closed right now.');
      }
    },
    booking: {
      keys: ['rezerv', 'objedn', 'termin', 'book', 'appointment', 'reserv', 'order', 'volny', 'available'],
      chip: { sk: 'Rezervácia', en: 'Book a time' },
      sk: function () {
        return 'Termín si môžeš zarezervovať online – vyberieš barbera, službu, dátum a čas a potvrdíme ti ho telefonicky alebo SMS.<br><a href="' + BOOK + '">Zarezervovať termín →</a><br><br>Alebo zavolaj na <a href="' + TEL + '">' + PHONE + '</a>, prípadne nám napíš na <a href="' + IG + '" target="_blank" rel="noopener">Instagram</a>.';
      },
      en: function () {
        return 'You can book online — choose a barber, a service, a date and a time, and we will confirm it by phone or SMS.<br><a href="' + BOOK + '">Book an appointment →</a><br><br>Or call <a href="' + TEL + '">' + PHONE + '</a>, or message us on <a href="' + IG + '" target="_blank" rel="noopener">Instagram</a>.';
      }
    },
    location: {
      keys: ['kde', 'adres', 'ulic', 'prievidz', 'hurban', 'mapa', 'navig', 'where', 'address', 'location', 'map', 'find', 'directions', 'parking', 'parkov'],
      chip: { sk: 'Kde nás nájdeš', en: 'Where to find us' },
      sk: function () {
        return '<b>BARBERIS</b><br>Hurbana 4, 971 01 Prievidza<br>V centre Prievidze, pár krokov od námestia.<br><a href="' + MAPS + '" target="_blank" rel="noopener">Navigovať →</a>';
      },
      en: function () {
        return '<b>BARBERIS</b><br>Hurbana 4, 971 01 Prievidza<br>In the center of Prievidza, a few steps from the square.<br><a href="' + MAPS + '" target="_blank" rel="noopener">Navigate →</a>';
      }
    },
    services: {
      keys: ['sluzb', 'strih', 'fade', 'brad', 'ornament', 'holen', 'farb', 'plet', 'service', 'haircut', 'beard', 'shave', 'kids', 'child', 'detsk', 'offer', 'ponuk'],
      chip: { sk: 'Služby', en: 'Services' },
      sk: function () {
        return 'Ponúkame pánsky strih, fade, úpravu brady, kompletný balík strih + brada, ornamentálne strihy, detský strih do 12 rokov, holenie hlavy, farbenie brady a čistenie pleti.<br><a href="index.html#services">Pozrieť služby →</a>';
      },
      en: function () {
        return 'We offer men’s haircuts, fades, beard trims, the complete haircut + beard package, ornamental cuts, kids’ haircuts up to 12 years, head shaves, beard coloring and facial cleansing.<br><a href="index.html#services">See services →</a>';
      }
    },
    team: {
      keys: ['tim', 'barber', 'anett', 'karvy', 'vladis', 'team', 'who', 'kto', 'zakladat', 'founder'],
      chip: { sk: 'Náš tím', en: 'Our team' },
      sk: function () {
        return '<b>Anett</b> – zakladateľka, barbering robí takmer 7 rokov.<br><b>Karvy</b> – 6 rokov skúseností, špecialista na ornamentálne strihy a jeden z našich showmanov.<br><b>Vladis</b> – 4 roky skúseností, precízna práca a pohodová atmosféra.<br><a href="index.html#team">Spoznať tím →</a>';
      },
      en: function () {
        return '<b>Anett</b> – founder, barbering for almost 7 years.<br><b>Karvy</b> – 6 years of experience, ornamental cuts specialist and one of our showmen.<br><b>Vladis</b> – 4 years of experience, precise work and a relaxed atmosphere.<br><a href="index.html#team">Meet the team →</a>';
      }
    },
    change: {
      keys: ['zrus', 'zmen', 'presun', 'cancel', 'change', 'reschedul', 'move'],
      chip: { sk: 'Zrušiť / zmeniť termín', en: 'Cancel / change' },
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
        return 'Zavolaj: <a href="' + TEL + '">' + PHONE + '</a><br>Instagram: <a href="' + IG + '" target="_blank" rel="noopener">@barberis</a><br>Facebook: <a href="https://facebook.com/barberisprievidza" target="_blank" rel="noopener">Barberis</a>';
      },
      en: function () {
        return 'Call: <a href="' + TEL + '">' + PHONE + '</a><br>Instagram: <a href="' + IG + '" target="_blank" rel="noopener">@barberis</a><br>Facebook: <a href="https://facebook.com/barberisprievidza" target="_blank" rel="noopener">Barberis</a>';
      }
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
  var ORDER = ['change', 'booking', 'prices', 'hours', 'location', 'team', 'contact', 'services', 'hello', 'thanks'];
  var CHIPS = ['prices', 'hours', 'booking', 'location', 'team', 'contact'];

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
    '#bb-chat-btn{position:fixed;right:16px;bottom:16px;z-index:30;width:52px;height:52px;border-radius:50%;border:none;background:#c9a06a;color:#141311;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(0,0,0,0.45);}' +
    '#bb-chat-btn svg{width:24px;height:24px;}' +
    '#bb-chat{position:fixed;right:16px;bottom:80px;z-index:30;width:min(360px,calc(100vw - 32px));height:min(480px,calc(100vh - 110px));display:flex;flex-direction:column;visibility:hidden;opacity:0;pointer-events:none;transform:translateY(14px) scale(.94);transform-origin:bottom right;transition:opacity .28s ease,transform .38s cubic-bezier(.22,1,.36,1),visibility 0s linear .38s;background:#1a1815;color:#f4ede1;border:1px solid rgba(244,237,225,0.12);border-radius:6px;box-shadow:0 12px 40px rgba(0,0,0,0.55);overflow:hidden;font-family:"Work Sans",sans-serif;}' +
    '#bb-chat.open{visibility:visible;opacity:1;pointer-events:auto;transform:none;transition:opacity .28s ease,transform .38s cubic-bezier(.22,1,.36,1),visibility 0s;}' +
    '#bb-chat header{display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-bottom:1px solid rgba(244,237,225,0.08);background:#141311;}' +
    '#bb-chat header b{display:block;font-family:"Fraunces",serif;font-size:14px;letter-spacing:0.02em;}' +
    '#bb-chat header span{font-size:10.5px;color:rgba(244,237,225,0.55);}' +
    '#bb-chat header button{background:none;border:none;color:#f4ede1;font-size:22px;line-height:1;cursor:pointer;padding:0 4px;}' +
    '#bb-msgs{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:8px;}' +
    '.bb-m{max-width:86%;padding:9px 12px;border-radius:10px;font-size:13px;line-height:1.5;}' +
    '.bb-m a{color:#c9a06a;text-decoration:underline;}' +
    '.bb-m.bot{background:#241f1a;color:#cfc6b8;align-self:flex-start;border-bottom-left-radius:2px;}' +
    '.bb-m.me{background:#c9a06a;color:#141311;align-self:flex-end;border-bottom-right-radius:2px;}' +
    '#bb-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px;}' +
    '#bb-chips button{background:none;border:1px solid rgba(201,160,106,0.55);color:#c9a06a;border-radius:999px;padding:5px 10px;font:inherit;font-size:11.5px;cursor:pointer;}' +
    '#bb-form{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(244,237,225,0.08);background:#141311;}' +
    '#bb-form input{flex:1;min-width:0;background:#1a1815;border:1px solid rgba(244,237,225,0.14);border-radius:3px;color:#f4ede1;padding:9px 10px;font:inherit;font-size:16px;}' +
    '#bb-form button{background:#c9a06a;color:#141311;border:none;border-radius:3px;padding:0 14px;font:inherit;font-size:12px;font-weight:700;letter-spacing:0.05em;cursor:pointer;}' +
    '#bb-chat-btn{transition:transform .25s cubic-bezier(.22,1,.36,1),box-shadow .25s ease;}' +
    '#bb-chat-btn:hover{transform:scale(1.07);box-shadow:0 8px 26px rgba(0,0,0,0.5);}' +
    '#bb-chat-btn:active{transform:scale(.94);}' +
    '#bb-chat-btn .ic{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;transition:transform .35s cubic-bezier(.22,1,.36,1),opacity .25s ease;}' +
    '#bb-chat-btn .ic-x{opacity:0;transform:rotate(-90deg) scale(.5);}' +
    '#bb-chat-btn.open .ic-chat{opacity:0;transform:rotate(90deg) scale(.5);}' +
    '#bb-chat-btn.open .ic-x{opacity:1;transform:none;}' +
    '#bb-chat-btn::after{content:"";position:absolute;inset:0;border-radius:50%;border:2px solid #c9a06a;opacity:0;pointer-events:none;}' +
    '.bb-m.bot.typing{display:flex;gap:4px;align-items:center;padding:12px 14px;}' +
    '.bb-m.typing i{width:6px;height:6px;border-radius:50%;background:#c9a06a;opacity:.45;}' +
    '@media (prefers-reduced-motion:no-preference){' +
      '#bb-chat-btn{animation:bbPop .6s cubic-bezier(.34,1.56,.64,1) 1.2s both;}' +
      '#bb-chat-btn.attn::after{animation:bbRing 2.6s ease-out 2.2s infinite;}' +
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
      '<header><div><b id="bb-title"></b><span id="bb-sub"></span></div><button type="button" id="bb-x">&times;</button></header>' +
      '<div id="bb-msgs" aria-live="polite"></div><div id="bb-chips"></div>' +
      '<form id="bb-form" autocomplete="off"><input id="bb-input" type="text" maxlength="200"><button type="submit" id="bb-send"></button></form>';
    document.body.appendChild(box);
    document.body.appendChild(btn);

    var msgs = box.querySelector('#bb-msgs');
    var chips = box.querySelector('#bb-chips');
    var input = box.querySelector('#bb-input');
    var started = false;

    function add(html, who) {
      var d = document.createElement('div');
      d.className = 'bb-m ' + who;
      if (who === 'me') d.textContent = html; else d.innerHTML = html;
      msgs.appendChild(d);
      msgs.scrollTop = msgs.scrollHeight;
    }
    function reply(id) {
      var l = lang();
      var html = id ? TOPICS[id][l]() : UI[l].fallback;
      var dots = document.createElement('div');
      dots.className = 'bb-m bot typing';
      dots.innerHTML = '<i></i><i></i><i></i>';
      msgs.appendChild(dots);
      msgs.scrollTop = msgs.scrollHeight;
      var wait = Math.min(1100, 450 + html.length * 1.2);
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
      box.querySelector('#bb-send').textContent = UI[l].send;
      chips.innerHTML = '';
      CHIPS.forEach(function (id) {
        var c = document.createElement('button');
        c.type = 'button';
        c.textContent = TOPICS[id].chip[l];
        c.addEventListener('click', function () { add(TOPICS[id].chip[l], 'me'); reply(id); });
        c.style.animationDelay = (0.25 + chips.children.length * 0.06) + 's';
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
