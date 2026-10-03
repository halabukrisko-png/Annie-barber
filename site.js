/* BARBERIS – small shared helpers.
   Google Maps is an expensive third-party embed, so it is only fetched when the visitor asks for it. */
(function () {
  Array.prototype.forEach.call(document.querySelectorAll('.map-load'), function (btn) {
    btn.addEventListener('click', function () {
      var frame = btn.parentNode.querySelector('iframe[data-src]');
      if (frame) frame.src = frame.getAttribute('data-src');
      btn.parentNode.removeChild(btn);
    });
  });
})();

/* Mobile scroll progress line at the top: fills while scrolling, glows once the page end is reached.
   Desktop/tablet has its own bar (.d-progress in desktop-m.js), so this only runs on phones. */
(function () {
  try {
    if (window.matchMedia('(min-width: 768px) and (min-height: 480px), (min-width: 1024px)').matches) return;
    var bar = document.createElement('div');
    bar.setAttribute('aria-hidden', 'true');
    bar.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:3px;z-index:70;pointer-events:none;transform:scaleX(0);transform-origin:left;will-change:transform;background:linear-gradient(90deg,#c9a06a,#e6c494);transition:box-shadow .5s ease,height .5s ease,filter .5s ease';
    document.body.appendChild(bar);
    var ticking = false;
    function update() {
      ticking = false;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(Math.max(window.pageYOffset / max, 0), 1) : 0;
      bar.style.transform = 'scaleX(' + p + ')';
      var end = p >= 0.995;
      bar.style.height = end ? '4px' : '3px';
      bar.style.filter = end ? 'brightness(1.25)' : 'none';
      bar.style.boxShadow = end ? '0 0 10px 2px rgba(230,196,148,.9), 0 0 22px 4px rgba(201,160,106,.55)' : 'none';
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  } catch (e) {}
})();
