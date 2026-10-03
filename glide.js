/* menu "Kontakt" -> slow, smooth glide to the contact section; menu "Galéria" -> slow fade to the gallery page (same feel as "O nás" / booking) */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var raf = 0;
  function glide(el, duration) {
    var startY = window.pageYOffset;
    var targetY = Math.max(0, startY + el.getBoundingClientRect().top - 84);
    if (reduce) { window.scrollTo(0, targetY); return; }
    var t0 = null;
    function stop() { cancelAnimationFrame(raf); window.removeEventListener('touchstart', stop); window.removeEventListener('wheel', stop); }
    window.addEventListener('touchstart', stop, { passive: true });
    window.addEventListener('wheel', stop, { passive: true });
    function step(ts) {
      if (!t0) t0 = ts;
      var p = Math.min((ts - t0) / duration, 1);
      var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
      window.scrollTo(0, startY + (targetY - startY) * e);
      if (p < 1) raf = requestAnimationFrame(step); else stop();
    }
    raf = requestAnimationFrame(step);
  }
  function closeMenu() {
    var ov = document.getElementById('nav-overlay');
    if (!ov || !ov.classList.contains('open')) return 0;
    var cb = document.getElementById('nav-close'); if (cb) cb.click();
    return 350;
  }
  function pageOf(p) { return p.replace(/\/+$/, '').replace(/\.html$/, '') || '/'; }
  document.addEventListener('click', function (ev) {
    var a = ev.target.closest && ev.target.closest('a[href]');
    if (!a || ev.defaultPrevented || ev.metaKey || ev.ctrlKey || ev.shiftKey || a.target === '_blank') return;
    var u; try { u = new URL(a.getAttribute('href'), location.href); } catch (x) { return; }
    if (u.origin !== location.origin) return;
    var here = pageOf(location.pathname), there = pageOf(u.pathname);
    var rootHere = here === '/' || here === '/index' || here === '/index-m';
    var rootThere = there === '/' || there === '/index' || there === '/index-m';
    if (u.hash === '#contact' && rootHere && rootThere) {
      var el = document.getElementById('contact');
      if (!el) return;
      ev.preventDefault();
      var wait = closeMenu();
      setTimeout(function () { glide(el, 1800); }, wait);
    } else if (/^\/galeria(-m)?$/.test(there) && there !== here && !reduce) {
      ev.preventDefault();
      var w = closeMenu();
      setTimeout(function () {
        document.body.style.transition = 'opacity .7s cubic-bezier(.22,1,.36,1)';
        document.body.style.opacity = '0';
        setTimeout(function () { location.href = a.href; }, 700);
      }, w);
    }
  });
  window.addEventListener('pageshow', function () { document.body.style.opacity = ''; document.body.style.transition = ''; });
  if (location.hash === '#contact') {
    var c = document.getElementById('contact');
    if (c) window.addEventListener('load', function () { window.scrollTo(0, 0); setTimeout(function () { glide(c, 1800); }, 350); });
  }
})();
