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
  var svcGrid = $('svc-grid'), barberGrid = $('barber-grid'), afterBarberWrap = $('cal-after-barber-wrap');
  var msgBox = $('cal-msg'), formBox = $('cal-form-box'), doneBox = $('cal-done');

  var HOURS_OPEN = { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1 };
  var DUR = { // minúty; Vladis má strih 45 min
    strih: { d: 30, Vladis: 45 }, komplet: { d: 60 }, brada: { d: 30 }, detsky: { d: 30 },
    holenie: { d: 30, Vladis: 45 }, farbenie: { d: 30 }, cistenie: { d: 30 }
  };

  var todayDate = new Date(); todayDate.setHours(0, 0, 0, 0);
  var view = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  var selectedDate = null, selectedTime = null, avail = null, loading = false, failed = false, token = 0;
  var cache = {};

  function selService() { return svcGrid.querySelector('.svc-btn.selected'); }
  function selBarber() { var b = barberGrid.querySelector('.barber-btn.selected'); return b ? b.getAttribute('data-barber') : null; }
  function svcId() { var s = selService(); return s ? s.getAttribute('data-service') : 'strih'; }

  // popisky služieb s dĺžkou podľa vybraného barbera
  function updateServiceLabels() {
    var b = selBarber() || '';
    all(svcGrid, '.svc-btn').forEach(function (btn) {
      var d = DUR[btn.getAttribute('data-service')];
      var m = (b && d[b]) || d.d;
      btn.querySelector('.svc-dur').textContent = m + ' min · ' + btn.getAttribute('data-price');
    });
  }

  function resetSelection() {
    selectedDate = null; selectedTime = null;
    slotsWrap.hidden = true; step4Wrap.hidden = true;
  }

  function load(cb) {
    var b = selBarber() || '', s = svcId();
    var from = key(view), to = key(new Date(view.getFullYear(), view.getMonth() + 1, 0));
    var ck = [s, b, from].join('|');
    var my = ++token;
    if (cache[ck] && Date.now() - cache[ck].t < 60000) { avail = cache[ck].days; failed = false; loading = false; render(); if (cb) cb(); return; }
    loading = true; failed = false; avail = null; render();
    fetch('/api/availability?service=' + encodeURIComponent(s) + '&barber=' + encodeURIComponent(b) + '&from=' + from + '&to=' + to, { cache: 'no-store' })
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
        if (date < todayDate || !HOURS_OPEN[date.getDay()] || !free) { btn.classList.add('disabled'); btn.disabled = true; }
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
    var times = (avail && selectedDate && avail[key(selectedDate)]) || [];
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
    step4Wrap.hidden = false; formBox.hidden = false; doneBox.hidden = true; setMsg('');
    updateSummary();
    step4Wrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function barberText() {
    var b = selBarber();
    return b ? ((en() ? ' with ' : ' u ') + b) : '';
  }

  function updateSummary() {
    if (!selectedDate || !selectedTime) return;
    var sb = selService();
    var svcName = sb ? sb.querySelector('.svc-name').textContent : '';
    summary.textContent = svcName + barberText() + ' · ' + I18N.dateLong(selectedDate) + (en() ? ' at ' : ' o ') + selectedTime;
  }

  function setMsg(text) { msgBox.textContent = text; msgBox.hidden = !text; }

  function book() {
    var name = nameField.value.trim(), phone = phoneField.value.trim(), mail = emailField.value.trim();
    if (name.length < 2) { setMsg(tr('Zadaj svoje meno.')); nameField.focus(); return; }
    if (phone.replace(/\D/g, '').length < 9) { setMsg(tr('Zadaj platné telefónne číslo.')); phoneField.focus(); return; }
    if (!mail) { setMsg(tr('Zadaj e-mail.')); emailField.focus(); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { setMsg(tr('Zadaj platný e-mail.')); emailField.focus(); return; }
    setMsg('');
    confirmBtn.classList.add('is-busy'); confirmBtn.setAttribute('aria-disabled', 'true');
    fetch('/api/book', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ service: svcId(), barber: selBarber() || '', date: key(selectedDate), time: selectedTime,
        name: name, phone: phone, email: mail, lang: en() ? 'en' : 'sk', website: ($('cal-website') || {}).value || '', debug: /[?&]debug=1/.test(location.search) })
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        confirmBtn.classList.remove('is-busy'); confirmBtn.removeAttribute('aria-disabled');
        if (res.ok && res.j.ok) {
          cache = {};
          formBox.hidden = true; doneBox.hidden = false;
          var who = res.j.barber ? ((en() ? ' with ' : ' u ') + res.j.barber) : '';
          var sb = selService();
          $('cal-done-text').textContent = (sb ? sb.querySelector('.svc-name').textContent : '') + (res.j.barber ? ((en() ? ' with ' : ' u ') + res.j.barber) : '') + ' · ' + I18N.dateLong(selectedDate) + (en() ? ' at ' : ' o ') + selectedTime;
          doneBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          resetAfterBooking();
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

  function resetAfterBooking() {
    nameField.value = ''; phoneField.value = ''; emailField.value = '';
    selectedTime = null; selectedDate = null; slotsWrap.hidden = true;
    load();
  }

  confirmBtn.addEventListener('click', function (e) {
    e.preventDefault();
    if (confirmBtn.getAttribute('aria-disabled') === 'true') return;
    book();
  });
  var again = $('cal-again');
  if (again) again.addEventListener('click', function () { step4Wrap.hidden = true; doneBox.hidden = true; formBox.hidden = false; });

  function changed() { resetSelection(); updateServiceLabels(); load(); }

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
  [nameField, phoneField, emailField].forEach(function (f) { f.addEventListener('input', function () { if (msgBox.textContent) setMsg(''); }); });

  prevBtn.addEventListener('click', function () { view.setMonth(view.getMonth() - 1); resetSelection(); load(); });
  nextBtn.addEventListener('click', function () { view.setMonth(view.getMonth() + 1); resetSelection(); load(); });

  window.addEventListener('langchange', function () {
    render();
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
