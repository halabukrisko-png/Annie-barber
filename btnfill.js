/* every "Zarezervovať termín" button (.btn-cta) and the barber-card buttons (.bio-book): when it scrolls into view, the bronze fill sweeps across it from the left ---- */
(function () {
  if (!('IntersectionObserver' in window) || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
  var st = document.createElement('style');
  st.textContent =
    '.btn-fill-init{background-color:transparent !important;background-image:linear-gradient(135deg,#e2bd88,#c9a06a 55%,#b88f58) !important;background-repeat:no-repeat !important;background-position:left center !important;background-size:0% 100% !important;background-origin:border-box !important;background-clip:border-box !important;color:#c9a06a !important;border:1px solid #c9a06a !important;text-shadow:none !important;transition:background-size 1.1s cubic-bezier(.45,.05,.2,1),color .5s ease .4s,transform .25s ease,box-shadow .25s ease,filter .25s ease !important;}' +
    '.btn-fill-init.btn-fill-go{background-size:100% 100% !important;color:#17130e !important;}' +
    '.btn-fill-init.btn-fill-go:hover{filter:brightness(1.07);}';
  document.head.appendChild(st);
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('btn-fill-go');
      io.unobserve(e.target);
    });
  }, { threshold: 0.8 });
  Array.prototype.forEach.call(document.querySelectorAll('.btn-cta, .bio-book'), function (b) {
    b.classList.add('btn-fill-init');
    io.observe(b);
  });
})();
