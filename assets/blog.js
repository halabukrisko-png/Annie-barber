/* BARBERIS blog: mobile menu, scroll reveals, category filter, reading progress.
   No dependencies. Everything degrades gracefully without JS. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* mobile menu */
  var o = doc.getElementById('m-open'), n = doc.getElementById('m-nav'), c = doc.getElementById('m-close');
  if (o && n && c) {
    var setMenu = function (v) {
      n.classList.toggle('open', v);
      o.setAttribute('aria-expanded', v);
      doc.body.style.overflow = v ? 'hidden' : '';
      if (v) c.focus(); else o.focus();
    };
    o.addEventListener('click', function () { setMenu(true); });
    c.addEventListener('click', function () { setMenu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && n.classList.contains('open')) setMenu(false); });
  }

  /* scroll reveals */
  var rv = [].slice.call(doc.querySelectorAll('.rv'));
  var io = null;
  function revealNow(el) { el.classList.add('in'); }
  if (rv.length) {
    if (!('IntersectionObserver' in window) || reduce) {
      rv.forEach(revealNow);
    } else {
      io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { revealNow(e.target); io.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      rv.forEach(function (el) { io.observe(el); });
    }
  }

  /* category filter (blog index) */
  var bar = doc.querySelector('.filters'), chips = [].slice.call(doc.querySelectorAll('.chip'));
  var list = doc.getElementById('list'), feat = doc.getElementById('feat'), empty = doc.getElementById('empty');
  if (chips.length && list) {
    var items = [].slice.call(list.querySelectorAll('[data-cat]'));
    var current = 'vsetko', timer = null;

    var listHead = doc.getElementById('list-h');
    var apply = function (k) {
      var shown = 0;
      list.setAttribute('data-filter', k);
      items.forEach(function (i) {
        var inCat = k === 'vsetko' || i.getAttribute('data-cat') === k;
        i.hidden = !inCat;
        if (inCat) revealNow(i);
        if (inCat && !(k === 'vsetko' && i.classList.contains('is-feat'))) shown++;
      });
      if (feat) feat.hidden = k !== 'vsetko';
      list.hidden = shown === 0;
      if (listHead) listHead.hidden = shown === 0;
      if (empty) empty.style.display = (shown || (feat && k === 'vsetko')) ? 'none' : 'block';
      list.classList.remove('switching');
    };

    var select = function (k, animate) {
      if (k === current && animate) return;
      current = k;
      chips.forEach(function (x) {
        var on = x.getAttribute('data-cat') === k;
        x.classList.toggle('on', on);
        x.setAttribute('aria-pressed', on);
        if (on && x.scrollIntoView) {
          var wrap = x.parentNode;
          wrap.scrollTo ? wrap.scrollTo({ left: x.offsetLeft - wrap.clientWidth / 2 + x.offsetWidth / 2, behavior: reduce ? 'auto' : 'smooth' }) : 0;
        }
      });
      clearTimeout(timer);
      if (animate && !reduce) {
        list.classList.add('switching');
        timer = setTimeout(function () { apply(k); }, 200);
      } else {
        apply(k);
      }
      try { history.replaceState(null, '', k === 'vsetko' ? location.pathname : '#' + k); } catch (e) {}
    };

    chips.forEach(function (x) {
      x.addEventListener('click', function () { select(x.getAttribute('data-cat'), true); });
    });
    var reset = doc.getElementById('empty-reset');
    if (reset) reset.addEventListener('click', function () { select('vsetko', true); });

    var h = (location.hash || '').replace('#', '');
    if (h && chips.some(function (x) { return x.getAttribute('data-cat') === h; })) select(h, false);

    /* scroll hints on the horizontally scrolling category bar */
    var sc = chips[0].parentNode;
    var hint = function () {
      if (!bar) return;
      bar.classList.toggle('fade-l', sc.scrollLeft > 8);
      bar.classList.toggle('fade-r', sc.scrollLeft + sc.clientWidth < sc.scrollWidth - 8);
    };
    sc.addEventListener('scroll', hint, { passive: true });
    window.addEventListener('resize', hint);
    hint();
  }

  /* reading progress (article pages) */
  var barEl = doc.querySelector('.progress i'), art = doc.querySelector('article.body');
  if (barEl && art) {
    var ticking = false;
    var upd = function () {
      var r = art.getBoundingClientRect(), vh = window.innerHeight;
      var p = (vh * 0.3 - r.top) / Math.max(1, r.height - vh * 0.3);
      barEl.style.transform = 'scaleX(' + Math.min(1, Math.max(0, p)) + ')';
      ticking = false;
    };
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(upd); } }, { passive: true });
    window.addEventListener('resize', upd);
    upd();
  }
})();
