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
