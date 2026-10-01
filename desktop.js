/* BARBERIS — tablet + desktop enhancements.
   desktop.css is only loaded for LARGE (below), and every node injected here
   carries an inline display:none / display:contents, so phones are untouched:
   no layout, no reveal classes, no listeners doing work.

   - desktop nav + CTA (>= 1024px), footer (>= 768px)
   - scroll: header glass state, progress bar, scroll-spy, subtle parallax
   - fade-up / stagger reveals for blocks that don't already animate
   - pointer-follow glow on cards */
(function () {
  'use strict';

  var LARGE = '(min-width: 768px) and (min-height: 480px), (min-width: 1024px)';
  var large = window.matchMedia(LARGE);
  var desktop = window.matchMedia('(min-width: 1024px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var T = window.T || function (s) { return s; };

  var header = document.querySelector('.site-header, .topbar');
  var wrap = document.querySelector('.wrap');
  var isHome = !!document.getElementById('hero');
  var path = location.pathname.split('/').pop() || 'index.html';
  var home = isHome ? '' : 'index.html';

  /* translatable labels: keep the Slovak source, render through T() */
  var labels = [];
  function label(el, sk) {
    el.setAttribute('data-sk', sk);
    el.textContent = T(sk);
    labels.push(el);
    return el;
  }
  window.addEventListener('langchange', function () {
    labels.forEach(function (el) { el.textContent = T(el.getAttribute('data-sk')); });
  });

  function el(tag, cls, hidden) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (hidden) n.style.display = 'none';
    return n;
  }

  /* ---------- nav ---------- */
  var navLinks = [];
  if (header) {
    if (!isHome && wrap) wrap.classList.add('has-topbar');
    var logo = header.querySelector('a');
    var nav = el('nav', 'd-nav', true);
    nav.setAttribute('aria-label', 'Hlavná navigácia');
    [
      ['Úvod', isHome ? '#hero' : 'index.html', path === 'index.html' || path === '', 'hero'],
      ['O nás', 'o-nas.html', path === 'o-nas.html'],
      ['Galéria', 'galeria.html', path === 'galeria.html'],
      ['Kontakt', isHome ? '#contact' : 'index.html#contact', false, 'contact']
    ].forEach(function (l) {
      var a = label(el('a'), l[0]);
      a.href = l[1];
      if (l[2]) a.className = 'active';
      if (l[3]) a.setAttribute('data-spy', l[3]);
      nav.appendChild(a);
      navLinks.push(a);
    });
    if (logo && logo.nextSibling) header.insertBefore(nav, logo.nextSibling); else header.appendChild(nav);

    /* right-hand side: hamburger (+ the language switch i18n.js puts next to it) and the CTA.
       On sub-pages the hamburger sits directly in the header, so give it a wrapper first. */
    var burger = document.getElementById('nav-open');
    var right = burger ? burger.parentNode : header;
    if (right === header) {
      right = el('div');
      right.style.cssText = 'display:flex;align-items:center;gap:12px;';
      header.appendChild(right);
      if (burger) right.appendChild(burger);
    }
    right.classList.add('d-right');
    var cta = el('a', 'd-cta', true);
    cta.href = home + '#booking';
    cta.appendChild(label(el('b'), 'Zarezervovať termín'));
    var arrow = el('span'); arrow.textContent = '→'; arrow.setAttribute('aria-hidden', 'true');
    cta.appendChild(arrow);
    right.appendChild(cta);
  }

  /* ---------- hero: wrap the photo so desktop can frame it (display:contents = no-op on mobile) ---------- */
  var heroImg = document.querySelector('#hero > img');
  if (heroImg) {
    var visual = el('div', 'hero-visual');
    visual.style.display = 'contents';
    heroImg.parentNode.insertBefore(visual, heroImg);
    visual.appendChild(heroImg);
  }

  /* ---------- team: one wrapper around heading + portraits + bios (display:contents = no-op on mobile) ---------- */
  var teamHead = document.getElementById('team');
  var teamGrid = teamHead && teamHead.nextElementSibling;
  var teamBios = teamGrid && teamGrid.nextElementSibling;
  if (teamGrid && teamGrid.classList.contains('team-grid') && teamBios && teamBios.querySelector('.bio-card')) {
    var tf = el('div', 'd-team-frame');
    tf.style.display = 'contents';
    teamHead.parentNode.insertBefore(tf, teamHead);
    tf.appendChild(teamHead); tf.appendChild(teamGrid); tf.appendChild(teamBios);
  }

  /* ---------- footer ---------- */
  if (wrap) {
    var f = el('footer', 'd-footer', true);
    var grid = el('div', 'd-footer-grid');

    var brand = el('div');
    var b = el('div', 'd-footer-brand'); b.textContent = 'BARBERIS'; brand.appendChild(b);
    brand.appendChild(label(el('p', 'd-footer-tag'), 'Pánsky barbershop v Prievidzi · Hurbana 4'));
    var fcta = el('a', 'd-footer-cta'); fcta.href = home + '#booking';
    fcta.appendChild(label(el('span'), 'Zarezervovať termín →'));
    brand.appendChild(fcta);
    grid.appendChild(brand);

    function col(title, items) {
      var c = el('div');
      c.appendChild(label(el('h4'), title));
      var ul = el('ul');
      items.forEach(function (it) {
        var li = el('li');
        if (it[1]) {
          var a = label(el('a'), it[0]);
          a.href = it[1];
          if (/^https?:/.test(it[1])) { a.target = '_blank'; a.rel = 'noopener'; }
          li.appendChild(a);
        } else {
          label(li, it[0]);
        }
        ul.appendChild(li);
      });
      c.appendChild(ul);
      return c;
    }
    grid.appendChild(col('Navigácia', [
      ['Úvod', home + '#hero'], ['O nás', 'o-nas.html'], ['Galéria', 'galeria.html'], ['Kontakt', home + '#contact']
    ]));
    grid.appendChild(col('Kontakt', [
      ['0951 833 488', 'tel:+421951833488'],
      ['Instagram', 'https://www.instagram.com/_barberis._/'],
      ['Facebook', 'https://www.facebook.com/p/BARBERIS-100077906015748/'],
      ['Hurbana 4, 971 01 Prievidza', 'https://maps.google.com/?q=Hurbana+4,+Prievidza']
    ]));
    grid.appendChild(col('Otváracie hodiny', [
      ['Pondelok – Piatok · 8:00 – 18:00'], ['Sobota · 8:00 – 14:00'], ['Nedeľa zatvorené']
    ]));
    f.appendChild(grid);

    var bottom = el('div', 'd-footer-bottom');
    var copy = el('span');
    copy.appendChild(document.createTextNode('© ' + new Date().getFullYear() + ' BARBERIS. '));
    copy.appendChild(label(el('span'), 'Všetky práva vyhradené.'));
    bottom.appendChild(copy);
    var top = label(el('button'), 'Späť hore ↑');
    top.type = 'button';
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });
    bottom.appendChild(top);
    f.appendChild(bottom);
    wrap.appendChild(f);
  }

  /* ---------- progress bar ---------- */
  var bar = el('div', 'd-progress', true);
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  /* ---------- reveal on scroll (only where nothing animates already) ---------- */
  var REVEAL = [
    '#intro .intro-photo',
    '#services > div:first-child', '#services > h2', '#services > p',
    '#svc-list > .svc-hover-row',
    '#team > div:first-child', '#team > h2', '#team > p',
    '.team-grid > .team-trigger',
    '#reviews > div:first-child', '#reviews > h2', '#reviews > p',
    '.cta-frame',
    '.contact-frame > div:first-child', '.map-frame', '.contact-actions > .contact-action', '.hours-card',
    '#booking > div:first-child', '.booking-calendar', '.cancel-card',
    'div[style*="padding:26px 20px 24px"]',
    '.d-footer-grid > div'
  ];
  var STAGGER = /svc-hover-row|team-trigger|contact-action|d-footer-grid/;
  var reveals = [];

  function alreadyAnimated(n) {
    if (n.classList.contains('reveal') || n.querySelector('.reveal, .reveal-stagger')) return true;
    var p = n.parentElement;
    return !!(p && (p.classList.contains('reveal-stagger') || p.classList.contains('gallery-anim')));
  }

  if (large.matches && !reduce && 'IntersectionObserver' in window) {
    REVEAL.forEach(function (sel) {
      var list = document.querySelectorAll(sel);
      Array.prototype.forEach.call(list, function (n, i) {
        if (n.classList.contains('d-rv') || alreadyAnimated(n)) return;
        if (n.classList.contains('intro-photo')) return; // fades in via the page's own B-divider trigger
        n.classList.add('d-rv');
        if (STAGGER.test(sel)) n.style.setProperty('--d', (Math.min(i, 5) * 0.11).toFixed(2) + 's');
        reveals.push(n);
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var n = e.target;
        io.unobserve(n);
        n.classList.add('d-in');
        /* once shown, drop the reveal classes so hover transitions aren't delayed */
        var delay = parseFloat(n.style.getPropertyValue('--d')) || 0;
        setTimeout(function () {
          n.classList.remove('d-rv', 'd-in');
          n.style.removeProperty('--d');
        }, 1200 + delay * 1000);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
    reveals.forEach(function (n) { io.observe(n); });

    /* safety net: whatever is left when the page bottom is reached gets shown */
    window.addEventListener('scroll', function () {
      if (window.innerHeight + window.pageYOffset < document.documentElement.scrollHeight - 4) return;
      reveals.forEach(function (n) { if (n.classList.contains('d-rv')) n.classList.add('d-in'); });
    }, { passive: true });
  }

  /* ---------- bronze notch runs round the frame when it scrolls into view ---------- */
  (function () {
    var frames = document.querySelectorAll('#services, .d-team-frame');
    if (!frames.length) return;
    function done(f) { f.classList.add('ring-in', 'ring-done'); }
    if (reduce || !('IntersectionObserver' in window)) { Array.prototype.forEach.call(frames, done); return; }
    var rio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var f = e.target;
        rio.unobserve(f);
        f.classList.add('ring-in');
        setTimeout(function () { f.classList.add('ring-done'); }, 2800);
      });
    }, { threshold: 0.2 });
    Array.prototype.forEach.call(frames, function (f) { rio.observe(f); });
  })();

  /* ---------- the last line of the page lights up once the bottom of the page is in view ---------- */
  (function () {
    var cf = document.querySelector('.contact-frame');
    if (!cf) return;
    if (reduce) { cf.classList.add('line-in'); return; }
    function check() {
      if (cf.classList.contains('line-in')) return;
      if (cf.getBoundingClientRect().bottom <= window.innerHeight + 2) {
        cf.classList.add('line-in');
        window.removeEventListener('scroll', check);
        window.removeEventListener('resize', check);
      }
    }
    window.addEventListener('scroll', check, { passive: true });
    window.addEventListener('resize', check);
    check();
  })();

  /* ---------- scroll: header state, progress, scroll-spy, parallax ---------- */
  var introPhoto = document.querySelector('#intro .intro-photo');
  var ctaImg = document.querySelector('.cta-body > img');
  var contact = document.getElementById('contact');
  var ticking = false;

  function parallax(n, factor) {
    if (!n) return;
    var r = n.getBoundingClientRect();
    var vh = window.innerHeight;
    if (r.bottom < -100 || r.top > vh + 100) return;
    var off = (r.top + r.height / 2 - vh / 2) * factor;
    n.style.setProperty('--py', off.toFixed(1) + 'px');
  }

  /* the pages' own reveal only fires for elements inside the viewport; a fast
     scroll or an anchor jump can skip past them, so show whatever is above */
  var pageReveals = document.querySelectorAll('.scroll-line-wrap, .reveal, .drive-in, .reveal-stagger > *, .gallery-anim > *');
  function catchUp() {
    Array.prototype.forEach.call(pageReveals, function (n) {
      if (!n.classList.contains('in-view') && n.getBoundingClientRect().bottom < 0) n.classList.add('in-view');
    });
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (!large.matches) return;
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (header) header.classList.toggle('scrolled', y > 24);
      catchUp();
      if (!desktop.matches) return;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';

      if (isHome && contact && navLinks.length) {
        var inContact = contact.getBoundingClientRect().top < window.innerHeight * 0.45;
        navLinks.forEach(function (a) {
          var spy = a.getAttribute('data-spy');
          if (spy) a.classList.toggle('active', spy === (inContact ? 'contact' : 'hero'));
        });
      }

      if (!reduce) {
        if (heroImg) heroImg.style.setProperty('--py', (y < window.innerHeight ? Math.round(y * 0.06) : 0) + 'px');
        parallax(introPhoto, -0.05);
        parallax(ctaImg, -0.06);
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  if (!finePointer) return;

  /* ---------- card glow: writes --gx/--gy on the hovered card ---------- */
  var GLOW = '.svc-hover-row, .team-frame, .review-card, .contact-action, .hero-card';
  var glowEl = null, gx = 0, gy = 0, glowQueued = false;
  document.addEventListener('pointermove', function (e) {
    if (!large.matches) return;
    var t = e.target.closest ? e.target.closest(GLOW) : null;
    glowEl = t; gx = e.clientX; gy = e.clientY;
    if (t && !glowQueued) {
      glowQueued = true;
      requestAnimationFrame(function () {
        glowQueued = false;
        if (!glowEl) return;
        var r = glowEl.getBoundingClientRect();
        glowEl.style.setProperty('--gx', (gx - r.left) + 'px');
        glowEl.style.setProperty('--gy', (gy - r.top) + 'px');
      });
    }
  }, { passive: true });
})();
