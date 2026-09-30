/* BARBERIS — desktop enhancements.
   Injects a desktop nav, scroll progress, hero parallax, card glow, magnetic
   CTAs and a soft cursor ring. Everything is inert below 1024px (desktop.css is
   only loaded there, and the injected nodes carry inline display:none). */
(function () {
  'use strict';

  var desktop = window.matchMedia('(min-width: 1024px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  var header = document.querySelector('.site-header, .topbar');
  var wrap = document.querySelector('.wrap');
  var isHome = !!document.getElementById('hero');
  var path = location.pathname.split('/').pop() || 'index.html';

  /* ---------- nav ---------- */
  if (header) {
    if (!isHome && wrap) wrap.classList.add('has-topbar');
    var logo = header.querySelector('a');
    var nav = document.createElement('nav');
    nav.className = 'd-nav';
    nav.style.display = 'none';
    nav.setAttribute('aria-label', 'Hlavná navigácia');
    var links = [
      ['Úvod', isHome ? '#hero' : 'index.html', path === 'index.html' || path === ''],
      ['O nás', 'o-nas.html', path === 'o-nas.html'],
      ['Galéria', 'galeria.html', path === 'galeria.html'],
      ['Kontakt', isHome ? '#contact' : 'index.html#contact', false]
    ];
    links.forEach(function (l) {
      var a = document.createElement('a');
      a.href = l[1];
      a.textContent = l[0];
      if (l[2]) a.className = 'active';
      nav.appendChild(a);
    });
    if (logo && logo.nextSibling) header.insertBefore(nav, logo.nextSibling); else header.appendChild(nav);

    var cta = document.createElement('a');
    cta.className = 'd-cta';
    cta.style.display = 'none';
    cta.href = isHome ? '#booking' : 'index.html#booking';
    cta.textContent = 'Zarezervovať termín';
    header.appendChild(cta);
  }

  /* ---------- progress bar ---------- */
  var bar = document.createElement('div');
  bar.className = 'd-progress';
  bar.style.display = 'none';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  /* ---------- scroll: header state, progress, hero parallax ---------- */
  var heroImg = document.querySelector('#hero > img');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      if (!desktop.matches) return;
      var y = window.pageYOffset || document.documentElement.scrollTop;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
      if (header) header.classList.toggle('scrolled', y > 24);
      if (heroImg && !reduce) {
        heroImg.style.setProperty('--py', (y < window.innerHeight ? Math.round(y * 0.1) : 0) + 'px');
      }
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  if (!finePointer) return;

  /* ---------- card glow: writes --gx/--gy on the hovered card ---------- */
  var GLOW = '.svc-hover-row, .team-frame, .review-card, .contact-action, .photo-frame';
  var glowEl = null, gx = 0, gy = 0, glowQueued = false;
  document.addEventListener('pointermove', function (e) {
    if (!desktop.matches) return;
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

  if (reduce) return;

  /* ---------- magnetic CTAs ---------- */
  document.querySelectorAll('.btn-cta').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      if (!desktop.matches) return;
      var r = el.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / r.width;
      var dy = (e.clientY - (r.top + r.height / 2)) / r.height;
      el.classList.add('magnet-active');
      el.style.setProperty('--mx', (dx * 14).toFixed(1) + 'px');
      el.style.setProperty('--my', (dy * 8).toFixed(1) + 'px');
    });
    el.addEventListener('pointerleave', function () {
      el.classList.remove('magnet-active');
      el.style.setProperty('--mx', '0px');
      el.style.setProperty('--my', '0px');
    });
  });

  /* ---------- cursor ring (native cursor stays visible) ---------- */
  var ring = document.createElement('div');
  ring.className = 'd-cursor';
  ring.style.display = 'none';
  ring.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ring);

  var tx = -100, ty = -100, cx = -100, cy = -100, running = false;
  function loop() {
    cx += (tx - cx) * 0.18;
    cy += (ty - cy) * 0.18;
    ring.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    if (Math.abs(tx - cx) > 0.1 || Math.abs(ty - cy) > 0.1) requestAnimationFrame(loop); else running = false;
  }
  document.addEventListener('pointermove', function (e) {
    if (!desktop.matches) return;
    tx = e.clientX; ty = e.clientY;
    ring.classList.add('on');
    var hot = e.target.closest && e.target.closest('a, button, input, [role="button"], .team-trigger, .svc-thumb');
    ring.classList.toggle('hover', !!hot);
    if (!running) { running = true; requestAnimationFrame(loop); }
  }, { passive: true });
  document.addEventListener('pointerdown', function () { ring.classList.add('down'); });
  document.addEventListener('pointerup', function () { ring.classList.remove('down'); });
  document.documentElement.addEventListener('pointerleave', function () { ring.classList.remove('on'); });
})();
