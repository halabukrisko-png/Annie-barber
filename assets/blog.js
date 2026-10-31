/* BARBERIS blog: mobile menu, scroll reveals, category filter, reading progress.
   No dependencies. Everything degrades gracefully without JS. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* full-screen menu (same behaviour as the main site) */
  var o = doc.getElementById('nav-open'), n = doc.getElementById('nav-overlay'), c = doc.getElementById('nav-close');
  if (o && n && c) {
    var setMenu = function (v) {
      n.classList.toggle('open', v);
      o.setAttribute('aria-expanded', v);
      doc.body.style.overflow = v ? 'hidden' : '';
      (v ? c : o).focus();
    };
    o.addEventListener('click', function () { setMenu(true); });
    c.addEventListener('click', function () { setMenu(false); });
    n.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    doc.addEventListener('keydown', function (e) { if (e.key === 'Escape' && n.classList.contains('open')) setMenu(false); });
  }

  /* desktop: the SK / EN switch sits next to the logo, like on the main site */
  (function () {
    var header = doc.querySelector('.topbar'), mq = window.matchMedia('(min-width: 1024px)');
    if (!header) return;
    function setup() {
      var logo = header.querySelector('.logo'), sw = header.querySelector('.lang-switch');
      if (!logo || !sw || header.querySelector('.d-brand')) return;
      var brand = doc.createElement('div'); brand.className = 'd-brand';
      logo.parentNode.insertBefore(brand, logo); brand.appendChild(logo);
      var burger = doc.getElementById('nav-open');
      function place() {
        if (mq.matches) { if (sw.parentNode !== brand) brand.appendChild(sw); }
        else if (burger && sw.parentNode === brand) burger.parentNode.insertBefore(sw, burger);
      }
      place();
      mq.addEventListener ? mq.addEventListener('change', place) : mq.addListener(place);
    }
    if (doc.readyState === 'complete') setup(); else window.addEventListener('load', setup);
  })();

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

  /* SK / EN content translation. Slovak is the source language in the HTML; English lives in
     /assets/blog-en.js (window.BLOG_EN, keyed by the exact Slovak markup of each text block).
     The switch itself is the site-wide one from i18n.js (fires "langchange"). */
  (function () {
    var SKIP = '.topbar,.nav-overlay,script,style,svg,noscript';
    var main = doc.querySelector('main');
    if (!main) return;
    var norm = function (t) { return t.replace(/\s+/g, ' ').trim(); };
    var hasText = function (el) {
      for (var i = 0; i < el.childNodes.length; i++) {
        var nd = el.childNodes[i];
        if (nd.nodeType === 3 && nd.nodeValue.trim()) return true;
      }
      return false;
    };
    function collect() {
      var out = [], attrs = [];
      (function walk(el) {
        if (el.matches && el.matches(SKIP)) return;
        if (el.tagName === 'IMG' && el.getAttribute('alt')) attrs.push([el, 'alt']);
        if (el.hasAttribute && el.hasAttribute('aria-label')) attrs.push([el, 'aria-label']);
        if (hasText(el)) { out.push(el); return; }
        for (var i = 0; i < el.children.length; i++) walk(el.children[i]);
      })(main);
      return { units: out, attrs: attrs };
    }
    var data = null, meta = [];
    function metaNodes() {
      if (meta.length) return meta;
      var t = doc.querySelector('title');
      if (t) meta.push({ get: function () { return doc.title; }, set: function (v) { doc.title = v; } });
      ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:description"]'].forEach(function (q) {
        var m = doc.querySelector(q);
        if (m) meta.push({ get: function () { return m.getAttribute('content'); }, set: function (v) { m.setAttribute('content', v); } });
      });
      meta.forEach(function (m) { m.sk = m.get(); });
      return meta;
    }
    function apply(en) {
      var dict = window.BLOG_EN || {};
      if (!data) data = collect();
      data.units.forEach(function (el) {
        if (el.__sk === undefined) el.__sk = el.innerHTML;
        var tr = en && dict[norm(el.__sk)];
        el.innerHTML = tr || el.__sk;
      });
      data.attrs.forEach(function (a) {
        var el = a[0], k = 'data-sk-' + a[1];
        if (!el.hasAttribute(k)) el.setAttribute(k, el.getAttribute(a[1]));
        var sk = el.getAttribute(k), tr = en && dict[norm(sk)];
        el.setAttribute(a[1], tr || sk);
      });
      metaNodes().forEach(function (m) { var tr = en && dict[norm(m.sk)]; m.set(tr || m.sk); });
    }
    var isEn = function () { return window.LANG && window.LANG() === 'en'; };
    window.addEventListener('langchange', function () { apply(isEn()); });
    window.BLOG_I18N = { keys: function () { var d = collect(), k = []; d.units.forEach(function (e) { k.push(norm(e.innerHTML)); }); d.attrs.forEach(function (a) { k.push(norm(a[0].getAttribute(a[1]))); }); metaNodes().forEach(function (m) { k.push(norm(m.sk)); }); return k; } };
    if (isEn()) apply(true);
    else if (doc.readyState !== 'complete') window.addEventListener('load', function () { if (isEn()) apply(true); });
  })();
})();
