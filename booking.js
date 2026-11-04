/* Online rezervácia (o-nas.html + o-nas-m.html): voľné termíny a ukladanie idú cez /api/* do Google Kalendára. */
(function () {
  var grid = document.getElementById('cal-grid');
  if (!grid) return;
  var en = function () { return window.LANG && window.LANG() === 'en'; };
  var tr = function (s) { return window.T ? window.T(s) : s; };
  var $ = function (id) { return document.getElementById(id); };
  var all = function (root, sel) { return Array.prototype.slice.call(root.querySelectorAll(sel)); };
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function key(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function sameDay(a, b) { return key(a) === key(b); }

  var monthLabel = $('cal-month-label'), prevBtn = $('cal-prev'), nextBtn = $('cal-next');
  var slotsWrap = $('cal-slots-wrap'), slotsGrid = $('cal-slots'), selectedDateLabel = $('cal-selected-date');
  var summary = $('cal-summary'), confirmBtn = $('cal-confirm'), step4Wrap = $('cal-step4-wrap');
  var nameField = $('cal-name'), phoneField = $('cal-phone'), emailField = $('cal-email');
  var colorOpt = $('color-opt'), colorBox = $('cal-color');
  var partyBtns = $('party-btns'), partyTabs = $('party-tabs'), partyNote = $('party-note');
  var partyN = 1, cur = 0, persons = [blankPerson(), blankPerson(), blankPerson()]; // každá osoba: vlastný barber, služba, dátum, čas
  function blankPerson() { return { barber: null, service: 'strih', color: false, date: null, time: null, view: null }; }
  var svcGrid = $('svc-grid'), barberGrid = $('barber-grid'), afterBarberWrap = $('cal-after-barber-wrap');
  var codeBox = $('cal-code-box'), codeField = $('cal-code'), codeMsg = $('cal-code-msg'), codeOk = $('cal-code-ok');
  var smsToken = null, lastPayload = null, lastPhone = '';
  var msgBox = $('cal-msg'), formBox = $('cal-form-box'), doneBox = $('cal-done');

  var HOURS_OPEN = { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };
  var DUR = { // minúty; Vladis má strih 40 min
    strih: { d: 30, Vladis: 40 }, komplet: { d: 60 }, brada: { d: 30 }, detsky: { d: 30 },
    holenie: { d: 60 }, farbenie: { d: 30 }, cistenie: { d: 30 }
  };

  var todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
  var MAX_DAYS = 44; // mesiac a 2 týždne dopredu (musí sedieť s HORIZON_DAYS v api/_lib/config.js)
  var maxDate = new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + MAX_DAYS);
  var view = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  var selectedDate = null, selectedTime = null, avail = null, loading = false, failed = false, token = 0;
  var cache = {};

  function selService() { return svcGrid.querySelector('.svc-btn.selected'); }
  function selBarber() { var b = barberGrid.querySelector('.barber-btn.selected'); return b ? b.getAttribute('data-barber') : null; }
  function svcId() { var s = selService(); return s ? s.getAttribute('data-service') : 'strih'; }
  // farbenie brady (+30 min) sa ponúka pri službách s bradou
  var BEARD = { komplet: 1, brada: 1, holenie: 1 };
  function hasColor() { return !!(BEARD[svcId()] && colorBox && colorBox.checked); }
  function updateColorOpt() {
    if (!colorOpt) return;
    var show = !!BEARD[svcId()];
    colorOpt.hidden = !show;
    if (!show && colorBox) colorBox.checked = false;
  }

  // popisky služieb s dĺžkou podľa vybraného barbera
  function updateServiceLabels() {
    var b = selBarber() || '';
    all(svcGrid, '.svc-btn').forEach(function (btn) {
      var d = DUR[btn.getAttribute('data-service')];
      var m = ((b && d[b]) || d.d) + (hasColor() && BEARD[btn.getAttribute('data-service')] && btn.classList.contains('selected') ? 30 : 0);
      btn.querySelector('.svc-dur').textContent = m + ' min · ' + btn.getAttribute('data-price');
    });
  }

  function resetSelection() {
    selectedDate = null; selectedTime = null;
    slotsWrap.hidden = true; step4Wrap.hidden = true;
    commit();
  }

  // ---- viac osôb: každá osoba má vlastný výber (záložky Osoba 1/2/3) ----
  function saveCur() {
    var p = persons[cur];
    p.barber = selBarber(); p.service = svcId(); p.color = hasColor(); p.date = selectedDate; p.time = selectedTime; p.view = new Date(view);
  }
  function commit() { saveCur(); renderTabs(); }
  function allDone() { for (var i = 0; i < partyN; i++) if (!persons[i].date || !persons[i].time) return false; return true; }
  function renderTabs() {
    if (!partyTabs) return;
    partyTabs.hidden = partyN < 2; if (partyNote) partyNote.hidden = partyN < 2;
    partyTabs.innerHTML = '';
    for (var i = 0; i < partyN; i++) {
      (function (i) {
        var p = persons[i], b = document.createElement('button');
        b.type = 'button'; b.className = 'party-tab' + (i === cur ? ' selected' : '') + (p.date && p.time ? ' done' : '');
        var n = document.createElement('span'); n.className = 'pt-name'; n.textContent = (en() ? 'Person ' : 'Osoba ') + (i + 1);
        var t = document.createElement('span'); t.className = 'pt-sub'; t.textContent = p.date && p.time ? I18N.dateShort(p.date) + ' · ' + p.time : (en() ? 'choose' : 'vyber');
        b.appendChild(n); b.appendChild(t);
        b.addEventListener('click', function () { if (i !== cur) goTo(i); });
        partyTabs.appendChild(b);
      })(i);
    }
  }
  var calBox = $('booking-calendar');
  function goTo(i) {
    saveCur(); cur = i;
    var p = persons[i];
    all(barberGrid, '.barber-btn').forEach(function (b) { b.classList.remove('selected'); });
    if (p.barber !== null) { var bb = barberGrid.querySelector('.barber-btn[data-barber="' + p.barber + '"]'); if (bb) bb.classList.add('selected'); }
    afterBarberWrap.hidden = p.barber === null;
    all(svcGrid, '.svc-btn').forEach(function (b) { b.classList.toggle('selected', b.getAttribute('data-service') === p.service); });
    if (colorBox) colorBox.checked = !!p.color;
    updateColorOpt(); updateServiceLabels();
    selectedDate = p.date; selectedTime = p.time;
    view = p.view ? new Date(p.view) : new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    step4Wrap.hidden = !allDone();
    slotsWrap.hidden = !selectedDate;
    renderTabs();
    if (calBox) calBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (p.barber === null) { render(); return; }
    load(function () { if (selectedDate) { selectedDateLabel.textContent = I18N.dateShort(selectedDate); renderSlots(); slotsWrap.hidden = false; } if (allDone()) updateSummary(); });
  }
  function setParty(n) {
    saveCur();
    partyN = n;
    all(partyBtns, '.party-btn').forEach(function (b) { var on = +b.getAttribute('data-n') === n; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    if (cur >= n) goTo(0); else renderTabs();
    step4Wrap.hidden = !allDone();
  }
  if (partyBtns) all(partyBtns, '.party-btn').forEach(function (b) { b.addEventListener('click', function () { setParty(+b.getAttribute('data-n')); }); });
  // iná osoba s rovnakým barberom v rovnaký deň: prekrývajúce sa časy sa neponúknu
  function conflicts(t) {
    var b = selBarber(); if (!b || !selectedDate) return false;
    var key0 = key(selectedDate), mine = DUR[svcId()] || {};
    function mins(x) { var a = x.split(':'); return +a[0] * 60 + +a[1]; }
    var d1 = (mine[b] || mine.d) + (hasColor() ? 30 : 0), s1 = mins(t);
    for (var j = 0; j < partyN; j++) {
      if (j === cur) continue;
      var o = persons[j];
      if (!o.date || !o.time || o.barber !== b || key(o.date) !== key0) continue;
      var od = DUR[o.service] || {}, d2 = (od[b] || od.d) + (o.color ? 30 : 0), s2 = mins(o.time);
      if (s1 < s2 + d2 && s2 < s1 + d1) return true;
    }
    return false;
  }

  function load(cb) {
    var b = selBarber() || '', s = svcId();
    var from = key(view), to = key(new Date(view.getFullYear(), view.getMonth() + 1, 0));
    var c = hasColor() ? '1' : '';
    var ck = [s, b, from, c].join('|');
    var my = ++token;
    if (cache[ck] && Date.now() - cache[ck].t < 60000) { avail = cache[ck].days; failed = false; loading = false; render(); if (cb) cb(); return; }
    loading = true; failed = false; avail = null; render();
    fetch('/api/availability?service=' + encodeURIComponent(s) + '&barber=' + encodeURIComponent(b) + (c ? '&color=1' : '') + '&from=' + from + '&to=' + to, { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (j) {
        if (my !== token) return;
        cache[ck] = { t: Date.now(), days: j.days || {} };
        avail = cache[ck].days; loading = false; failed = false; render(); if (cb) cb();
      })
      .catch(function () {
        if (my !== token) return;
        loading = false; failed = true; avail = {}; render();
      });
  }

  function render() {
    grid.innerHTML = '';
    grid.classList.toggle('is-loading', loading);
    monthLabel.textContent = I18N.months()[view.getMonth()] + ' ' + view.getFullYear();
    prevBtn.disabled = view.getFullYear() === todayDate.getFullYear() && view.getMonth() === todayDate.getMonth();
    var startOffset = (new Date(view.getFullYear(), view.getMonth(), 1).getDay() + 6) % 7;
    var dim = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
    for (var i = 0; i < startOffset; i++) { var e = document.createElement('span'); e.className = 'cal-day empty'; grid.appendChild(e); }
    for (var d = 1; d <= dim; d++) {
      (function (d) {
        var date = new Date(view.getFullYear(), view.getMonth(), d);
        var btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'cal-day'; btn.textContent = d;
        var free = avail && avail[key(date)];
        if (date > maxDate && HOURS_OPEN[date.getDay()]) {
          // príliš ďaleko: vyzerá ako nedostupný, ale po kliknutí vysvetlí, že treba zavolať/napísať
          btn.classList.add('disabled'); btn.style.cursor = 'pointer';
          btn.addEventListener('click', function () { selectDate(date, btn); });
        }
        else if (date < todayDate || !HOURS_OPEN[date.getDay()] || !free) { btn.classList.add('disabled'); btn.disabled = true; }
        else {
          // obsadený deň (prázdne pole): vyzerá ako nedostupný, ale po kliknutí napíše, že už nie je voľný
          if (!free.length) { btn.classList.add('disabled'); btn.style.cursor = 'pointer'; }
          btn.addEventListener('click', function () { selectDate(date, btn); });
        }
        if (sameDay(date, todayDate)) btn.classList.add('today');
        if (selectedDate && sameDay(date, selectedDate)) btn.classList.add('selected');
        grid.appendChild(btn);
      })(d);
    }
    var note = $('cal-load-note');
    if (note) {
      note.hidden = !(loading || failed);
      note.textContent = loading ? tr('Načítavam voľné termíny…') : tr('Voľné termíny sa nepodarilo načítať. Skús to znova alebo nám zavolaj.');
    }
  }

  function selectDate(date, btn) {
    selectedDate = date; selectedTime = null; step4Wrap.hidden = true;
    all(grid, '.cal-day').forEach(function (el) { el.classList.remove('selected'); });
    if (btn) btn.classList.add('selected');
    selectedDateLabel.textContent = I18N.dateShort(date);
    renderSlots();
    slotsWrap.hidden = false;
    slotsWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function renderSlots() {
    slotsGrid.innerHTML = '';
    if (selectedDate > maxDate) {
      var far = document.createElement('div');
      far.style.cssText = 'grid-column:1/-1;font-size:12.5px;line-height:1.5;color:var(--cream);text-align:center;padding:14px;border:1px dashed rgba(201,160,106,0.55);border-radius:3px;background:rgba(201,160,106,0.06);';
      far.appendChild(document.createTextNode(tr('Tak ďaleko dopredu sa online objednať nedá. Ak si prajete objednať tento dátum, zavolajte nám alebo napíšte na Instagram:') + ' '));
      var a = document.createElement('a'); a.href = 'tel:+421951833488'; a.textContent = '0951 833 488'; a.style.color = 'inherit';
      far.appendChild(a);
      far.appendChild(document.createTextNode(' · '));
      var ig = document.createElement('a'); ig.href = 'https://www.instagram.com/_barberis._/'; ig.target = '_blank'; ig.rel = 'noopener'; ig.textContent = '@BARBERIS'; ig.style.color = 'inherit';
      far.appendChild(ig);
      slotsGrid.appendChild(far);
      return;
    }
    var times = ((avail && selectedDate && avail[key(selectedDate)]) || []).filter(function (t) { return !conflicts(t); });
    times.forEach(function (t) {
      var btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'slot-btn'; btn.textContent = t;
      if (t === selectedTime) btn.classList.add('selected');
      btn.addEventListener('click', function () { selectSlot(t, btn); });
      slotsGrid.appendChild(btn);
    });
    if (!times.length) {
      var msg = document.createElement('div');
      msg.style.cssText = 'grid-column:1/-1;font-size:12.5px;line-height:1.5;color:var(--cream);text-align:center;padding:14px;border:1px dashed rgba(201,160,106,0.55);border-radius:3px;background:rgba(201,160,106,0.06);';
      msg.textContent = tr('Tento deň už nie je voľný. Vyber si, prosím, iný dátum.');
      slotsGrid.appendChild(msg);
    }
  }

  function selectSlot(t, btn) {
    selectedTime = t;
    all(slotsGrid, '.slot-btn').forEach(function (el) { el.classList.remove('selected'); });
    if (btn) btn.classList.add('selected');
    commit();
    if (!allDone()) { // ďalšia osoba ešte nemá termín: prepne sa na ňu
      step4Wrap.hidden = true;
      var nx = -1;
      for (var k = 1; k <= partyN; k++) { var idx = (cur + k) % partyN; if (!persons[idx].date || !persons[idx].time) { nx = idx; break; } }
      if (nx >= 0) setTimeout(function () { goTo(nx); }, 350);
      return;
    }
    step4Wrap.hidden = false; formBox.hidden = false; doneBox.hidden = true; codeBox.hidden = true; setMsg('');
    updateSummary();
    step4Wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function barberText() {
    var b = selBarber();
    return b ? ((en() ? ' with ' : ' u ') + b) : '';
  }

  function personLine(p) {
    var sb = svcGrid.querySelector('.svc-btn[data-service="' + p.service + '"]');
    var svcName = (sb ? sb.querySelector('.svc-name').textContent : '') + (p.color ? (en() ? ' + beard colouring' : ' + farbenie brady') : '');
    return svcName + (p.barber ? ((en() ? ' with ' : ' u ') + p.barber) : '') + ' · ' + I18N.dateLong(p.date) + (en() ? ' at ' : ' o ') + p.time;
  }
  function peopleText() {
    var out = [];
    for (var i = 0; i < partyN; i++) out.push((partyN > 1 ? (en() ? 'Person ' : 'Osoba ') + (i + 1) + ': ' : '') + personLine(persons[i]));
    return out.join('\n');
  }
  function updateSummary() {
    if (!allDone()) return;
    summary.style.whiteSpace = 'pre-line';
    summary.textContent = peopleText();
  }

  function setMsg(text) { msgBox.textContent = text; msgBox.hidden = !text; }

  function book() {
    var name = nameField.value.trim(), phone = phoneField.value.trim(), mail = emailField.value.trim();
    if (name.length < 2) { setMsg(tr('Zadaj svoje meno.')); nameField.focus(); return; }
    if (phone.replace(/\D/g, '').length < 9) { setMsg(tr('Zadaj platné telefónne číslo.')); phoneField.focus(); return; }
    if (!mail) { setMsg(tr('Zadaj e-mail.')); emailField.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { setMsg(tr('Zadaj platný e-mail.')); emailField.focus(); return; }
    var gdpr = $('cal-gdpr');
    if (gdpr && !gdpr.checked) { setMsg(tr('Pred rezerváciou musíš súhlasiť so spracovaním osobných údajov.')); gdpr.focus(); return; }
    setMsg('');
    confirmBtn.classList.add('is-busy'); confirmBtn.setAttribute('aria-disabled', 'true');
    saveCur(); lastText = peopleText();
    var people = persons.slice(0, partyN).map(function (p) { return { service: p.service, color: !!p.color, barber: p.barber || '', date: key(p.date), time: p.time }; });
    var payload = { service: people[0].service, barber: people[0].barber, date: people[0].date, time: people[0].time, people: partyN > 1 ? people : undefined,
      color: people[0].color, name: name, phone: phone, email: mail, lang: en() ? 'en' : 'sk', consent: true, website: ($('cal-website') || {}).value || '', debug: /[?&]debug=1/.test(location.search) };
    fetch('/api/book', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        confirmBtn.classList.remove('is-busy'); confirmBtn.removeAttribute('aria-disabled');
        if (res.ok && res.j.ok && res.j.sms) {
          smsToken = res.j.token; lastPayload = payload; lastPhone = phone;
          formBox.hidden = true; doneBox.hidden = true; codeBox.hidden = false;
          $('cal-code-text').textContent = tr('Poslali sme SMS s kódom na číslo') + ' ' + phone;
          codeField.value = ''; setCodeMsg('');
          codeField.focus();
        } else if (res.ok && res.j.ok) {
          showDone(res.j);
        } else {
          if (res.j && res.j.detail) { setMsg((res.j.error || '') + ' [' + res.j.detail + ']'); return; }
          setMsg(res.j && res.j.error ? (res.j.taken ? tr('Tento čas už nie je voľný. Vyber si, prosím, iný.') : res.j.error) : tr('Rezerváciu sa nepodarilo uložiť. Zavolaj nám prosím.'));
          if (res.j && res.j.taken) { cache = {}; selectedTime = null; load(function () { if (selectedDate) { renderSlots(); } }); step4Wrap.hidden = false; }
        }
      })
      .catch(function () {
        confirmBtn.classList.remove('is-busy'); confirmBtn.removeAttribute('aria-disabled');
        setMsg(tr('Rezerváciu sa nepodarilo uložiť. Zavolaj nám prosím.') + (/[?&]debug=1/.test(location.search) ? ' [sieťová chyba]' : ''));
      });
  }

  var lastText = '';
  function showDone(j) {
    cache = {};
    formBox.hidden = true; codeBox.hidden = true; doneBox.hidden = false;
    var verify = !!j.verify;
    $('cal-done-title').textContent = tr(verify ? 'Skontroluj e-mail ✉️' : 'Termín je zarezervovaný ✓');
    $('cal-done-note').textContent = tr(verify ? 'Poslali sme ti e-mail s odkazom. Rezervácia sa uloží, až keď naň klikneš (platí 30 minút). Pozri aj do spamu.' : 'Tešíme sa na teba. Ak potrebuješ termín zmeniť alebo zrušiť, zavolaj nám.');
    $('cal-done-text').style.whiteSpace = 'pre-line'; $('cal-done-text').textContent = lastText;
    doneBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    resetAfterBooking();
  }

  function setCodeMsg(text) { codeMsg.textContent = text; codeMsg.hidden = !text; }

  function confirmCode() {
    var code = codeField.value.replace(/\D/g, '');
    if (code.length < 4) { setCodeMsg(tr('Zadaj kód z SMS.')); codeField.focus(); return; }
    setCodeMsg('');
    codeOk.classList.add('is-busy'); codeOk.setAttribute('aria-disabled', 'true');
    fetch('/api/confirm', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: smsToken, code: code }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        codeOk.classList.remove('is-busy'); codeOk.removeAttribute('aria-disabled');
        if (res.ok && res.j.ok) { showDone(res.j); return; }
        if (res.j && res.j.taken) { codeBox.hidden = true; formBox.hidden = false; setMsg(tr('Tento čas už nie je voľný. Vyber si, prosím, iný.')); cache = {}; selectedTime = null; load(function () { if (selectedDate) renderSlots(); }); return; }
        setCodeMsg(res.j && res.j.error ? res.j.error : tr('Kód sa nepodarilo overiť. Skús to prosím znova alebo zavolaj.'));
      })
      .catch(function () {
        codeOk.classList.remove('is-busy'); codeOk.removeAttribute('aria-disabled');
        setCodeMsg(tr('Kód sa nepodarilo overiť. Skús to prosím znova alebo zavolaj.'));
      });
  }

  codeOk.addEventListener('click', function (e) { e.preventDefault(); if (codeOk.getAttribute('aria-disabled') !== 'true') confirmCode(); });
  codeField.addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); confirmCode(); } });
  $('cal-code-back').addEventListener('click', function (e) { e.preventDefault(); codeBox.hidden = true; formBox.hidden = false; phoneField.focus(); phoneField.select(); });
  $('cal-code-return').addEventListener('click', function (e) { e.preventDefault(); codeBox.hidden = true; formBox.hidden = false; step4Wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
  $('cal-code-resend').addEventListener('click', function (e) {
    e.preventDefault();
    if (!lastPayload) return;
    fetch('/api/book', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lastPayload) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (res.ok && res.j.sms) { smsToken = res.j.token; codeField.value = ''; setCodeMsg(''); setCodeMsg(tr('Kód bol poslaný znova.')); }
        else setCodeMsg(res.j && res.j.error ? res.j.error : tr('Kód sa nepodarilo overiť. Skús to prosím znova alebo zavolaj.'));
      })
      .catch(function () { setCodeMsg(tr('Kód sa nepodarilo overiť. Skús to prosím znova alebo zavolaj.')); });
  });

  function resetAfterBooking() {
    nameField.value = ''; phoneField.value = ''; emailField.value = '';
    if ($('cal-gdpr')) $('cal-gdpr').checked = false;
    selectedTime = null; selectedDate = null; slotsWrap.hidden = true;
    partyN = 1; cur = 0; persons = [blankPerson(), blankPerson(), blankPerson()];
    all(partyBtns, '.party-btn').forEach(function (b) { b.classList.toggle('selected', b.getAttribute('data-n') === '1'); b.setAttribute('aria-pressed', b.getAttribute('data-n') === '1' ? 'true' : 'false'); });
    saveCur(); renderTabs();
    load();
  }

  confirmBtn.addEventListener('click', function (e) {
    e.preventDefault();
    if (confirmBtn.getAttribute('aria-disabled') === 'true') return;
    book();
  });
  var again = $('cal-again');
  if (again) again.addEventListener('click', function () { step4Wrap.hidden = true; doneBox.hidden = true; codeBox.hidden = true; formBox.hidden = false; });

  function changed() { resetSelection(); updateColorOpt(); updateServiceLabels(); load(); }
  if (colorBox) colorBox.addEventListener('change', function () { resetSelection(); updateServiceLabels(); load(); });

  all(svcGrid, '.svc-btn').forEach(function (el) {
    el.addEventListener('click', function () {
      all(svcGrid, '.svc-btn').forEach(function (b) { b.classList.remove('selected'); });
      el.classList.add('selected'); changed();
    });
  });
  all(barberGrid, '.barber-btn').forEach(function (el) {
    el.addEventListener('click', function () {
      all(barberGrid, '.barber-btn').forEach(function (b) { b.classList.remove('selected'); });
      el.classList.add('selected');
      var first = afterBarberWrap.hidden;
      if (first) { afterBarberWrap.hidden = false; afterBarberWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
      changed();
    });
  });
  [nameField, phoneField, emailField, $('cal-gdpr')].forEach(function (f) { if (f) f.addEventListener('input', function () { if (msgBox.textContent) setMsg(''); }); });

  prevBtn.addEventListener('click', function () { view.setMonth(view.getMonth() - 1); resetSelection(); load(); });
  nextBtn.addEventListener('click', function () { view.setMonth(view.getMonth() + 1); resetSelection(); load(); });

  window.addEventListener('langchange', function () {
    render(); renderTabs();
    if (selectedDate) { selectedDateLabel.textContent = I18N.dateShort(selectedDate); renderSlots(); updateSummary(); }
  });

  updateServiceLabels();
  render();

  // Predvybraný dátum z chatu (?d=YYYY-MM-DD)
  (function () {
    var q = new URLSearchParams(location.search), d = q.get('d');
    if (!d) return;
    var p = d.split('-'), date = new Date(+p[0], +p[1] - 1, +p[2]);
    if (isNaN(date.getTime()) || date < todayDate) return;
    var anyBarber = barberGrid.querySelector('.barber-btn[data-barber=""]');
    if (anyBarber) anyBarber.click();
    view = new Date(date.getFullYear(), date.getMonth(), 1);
    load(function () {
      var btn = all(grid, '.cal-day:not(.empty)').filter(function (b) { return +b.textContent === date.getDate(); })[0];
      if (btn && !btn.disabled) selectDate(date, btn);
    });
  })();

  // ---- Zrušenie termínu ----
  (function () {
    var f = $('cancel-form'), out = $('cancel-result'), inp = $('cancel-contact'), sendBtn = $('cancel-send');
    if (!f || !out) return;
    var PHONE = '0951 833 488';
    function show(html) { out.hidden = !html; out.innerHTML = html || ''; }
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function call(body) {
      return fetch('/api/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); });
    }
    function fail(msg) { show('<span>' + esc(msg || (tr('Termín sa nepodarilo zrušiť. Zavolaj nám prosím na') + ' ' + PHONE + '.')) + '</span>'); }
    function when(it) {
      var p = it.date.split('-');
      return I18N.dateShort(new Date(+p[0], +p[1] - 1, +p[2])) + (en() ? ' at ' : ' o ') + it.time;
    }
    function list(items, contact) {
      if (!items.length) { show('<span>' + esc(tr('Nenašli sme žiadny budúci termín pre tento kontakt. Zavolaj nám na') + ' ' + PHONE + '.') + '</span>'); return; }
      show('<div>' + esc(tr('Vyber termín, ktorý chceš zrušiť:')) + '</div>' + items.map(function (it, i) {
        return '<div class="cr-item"><span>' + esc(it.service + (en() ? ' with ' : ' u ') + it.barber + ' · ' + when(it)) + '</span><button type="button" data-i="' + i + '">' + esc(tr('Zrušiť')) + '</button></div>';
      }).join(''));
      all(out, 'button[data-i]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var it = items[+btn.getAttribute('data-i')];
          if (!window.confirm(tr('Naozaj zrušiť tento termín?') + '\n' + it.service + ' · ' + when(it))) return;
          btn.disabled = true;
          // pri chybe servera / siete sa skúsi ešte raz automaticky
          function attempt(n) {
            return call({ contact: contact, id: it.id, barber: it.barber, lang: en() ? 'en' : 'sk' }).then(function (res) {
              if (!res.ok && res.status >= 500 && n < 1) return attempt(n + 1);
              return res;
            }, function (err) { if (n < 1) return attempt(n + 1); throw err; });
          }
          attempt(0).then(function (res) {
            if (res.ok && res.j.ok) { cache = {}; show('<span class="cr-ok">' + esc(en() ? 'Your appointment on ' + when(it) + ' has been cancelled.' : 'Tvoj termín ' + when(it) + ' bol zrušený.') + '</span>'); load(); }
            else { btn.disabled = false; fail(res.j && res.j.error); }
          }).catch(function () { btn.disabled = false; fail(); });
        });
      });
    }
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = (inp.value || '').trim();
      if (!v) { inp.focus(); return; }
      sendBtn.disabled = true; show('<span>' + esc(tr('Hľadám tvoje termíny…')) + '</span>');
      call({ contact: v }).then(function (res) {
        sendBtn.disabled = false;
        if (res.ok) list(res.j.items || [], v); else fail(res.j && res.j.error);
      }).catch(function () { sendBtn.disabled = false; fail(); });
    });
  })();
})();
