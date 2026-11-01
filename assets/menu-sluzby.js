/* BARBERIS – "Služby" (services) item in every menu.
   Adds a dropdown after "O nás" in the desktop nav (.d-nav) and an expandable
   item in the mobile menus (.nav-links on the main site and blog, .m-links on
   the service pages). Styles are copied from the neighbouring "O nás" link, so
   it matches whichever page it runs on. Safe to load anywhere; runs once. */
(function () {
  'use strict';
  var ITEMS = [
    ['Pánsky strih', 'Men’s haircut', '/pansky-strih-prievidza'],
    ['Úprava brady', 'Beard trim', '/uprava-brady-prievidza'],
    ['Detský strih', 'Kids’ haircut', '/detsky-strih-prievidza']
  ];
  var LABEL = ['Služby', 'Services'];
  var path = location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
  var onService = ITEMS.some(function (i) { return i[2] === path; });
  var nodes = []; // [element, sk, en]

  function en() { return typeof window.LANG === 'function' && window.LANG() === 'en'; }
  function txt(el, sk, e) { el.textContent = en() ? e : sk; nodes.push([el, sk, e]); return el; }
  function relabel() { nodes.forEach(function (n) { n[0].textContent = en() ? n[2] : n[1]; }); }
  function aboutLink(list) {
    var as = list.querySelectorAll(':scope > a');
    for (var i = 0; i < as.length; i++) if (/\/o-nas(-m)?(\.html)?$/.test(as[i].getAttribute('href') || '')) return as[i];
    return null;
  }
  function copy(from, to, props) {
    var cs = getComputedStyle(from);
    props.forEach(function (p) { to.style[p] = cs[p]; });
  }

  function css() {
    if (document.getElementById('ms-css')) return;
    var s = document.createElement('style');
    s.id = 'ms-css';
    s.textContent =
      '.ms-dd{position:relative;display:inline-flex;align-items:center}' +
      '.ms-btn{background:none;border:0;cursor:pointer;display:inline-flex;align-items:center;gap:7px;margin:0}' +
      '.ms-btn:after{content:"";width:5px;height:5px;border-right:1px solid currentColor;border-bottom:1px solid currentColor;transform:translateY(-2px) rotate(45deg);transition:transform .3s ease}' +
      '.ms-dd.open .ms-btn:after{transform:translateY(1px) rotate(-135deg)}' +
      '.ms-btn:hover,.ms-dd.open .ms-btn{opacity:1!important}' +
      '.ms-panel{position:absolute;top:calc(100% + 10px);left:50%;transform:translate(-50%,6px);min-width:210px;background:rgba(20,19,17,.98);border:1px solid rgba(201,160,106,.35);border-radius:3px;padding:8px 0;box-shadow:0 18px 40px -18px rgba(0,0,0,.8);opacity:0;visibility:hidden;transition:opacity .25s ease,transform .25s ease,visibility .25s;z-index:80;text-align:left}' +
      '.ms-panel:before{content:"";position:absolute;left:0;right:0;top:-14px;height:14px}' +
      '.ms-dd.open .ms-panel{opacity:1;visibility:visible;transform:translate(-50%,0)}' +
      '.ms-panel a.ms-sub{display:block!important;padding:10px 20px!important;font-size:10.5px!important;letter-spacing:.16em!important;text-transform:uppercase;font-weight:600;color:#f4ede1!important;opacity:.85!important;white-space:nowrap;box-shadow:none!important;border:0!important}' +
      '.ms-panel a.ms-sub:after{display:none!important}' +
      '.ms-panel a.ms-sub:hover,.ms-panel a.ms-sub.ms-on{opacity:1!important;color:#c9a06a!important;background:rgba(201,160,106,.06)}' +
      '.ms-tog{cursor:pointer;background:none;border:0;border-radius:0;-webkit-appearance:none;appearance:none}' +
      '.ms-tog:after{content:"";display:inline-block;width:8px;height:8px;margin-left:12px;border-right:1.5px solid #c9a06a;border-bottom:1.5px solid #c9a06a;transform:translateY(-5px) rotate(45deg);transition:transform .3s ease}' +
      '.ms-tog[aria-expanded="true"]:after{transform:translateY(0) rotate(-135deg)}' +
      '.ms-list{width:100%;max-height:0;overflow:hidden;transition:max-height .35s ease;flex-shrink:0}' +
      '.ms-tog{flex-shrink:0}' +
      '.ms-list.open{max-height:260px}' +
      '.ms-list a.ms-msub{display:block!important;width:100%;font-family:"Work Sans",system-ui,sans-serif!important;font-size:15px!important;letter-spacing:.08em;text-transform:uppercase;color:#cfc6b8!important;padding:11px 0!important;border-bottom:1px solid rgba(244,237,225,.05)!important;text-align:inherit}' +
      '.ms-list a.ms-msub.ms-on{color:#c9a06a!important}';
    document.head.appendChild(s);
  }

  function desktop(nav) {
    if (nav.querySelector('.ms-dd')) return;
    var about = aboutLink(nav);
    if (!about) return;
    var dd = document.createElement('div'); dd.className = 'ms-dd';
    var btn = document.createElement('button'); btn.type = 'button'; btn.className = 'ms-btn';
    btn.setAttribute('aria-haspopup', 'true'); btn.setAttribute('aria-expanded', 'false');
    copy(about, btn, ['fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'textTransform', 'color', 'opacity', 'paddingTop', 'paddingBottom', 'lineHeight']);
    btn.style.paddingLeft = btn.style.paddingRight = '0';
    if (onService) { btn.style.opacity = '1'; btn.style.color = '#c9a06a'; }
    txt(btn, LABEL[0], LABEL[1]);
    var panel = document.createElement('div'); panel.className = 'ms-panel';
    ITEMS.forEach(function (i) {
      var a = document.createElement('a'); a.className = 'ms-sub' + (i[2] === path ? ' ms-on' : ''); a.href = i[2];
      panel.appendChild(txt(a, i[0], i[1]));
    });
    dd.appendChild(btn); dd.appendChild(panel);
    function set(v) { dd.classList.toggle('open', v); btn.setAttribute('aria-expanded', v ? 'true' : 'false'); }
    btn.addEventListener('click', function (e) { e.stopPropagation(); set(!dd.classList.contains('open')); });
    dd.addEventListener('mouseenter', function () { set(true); });
    dd.addEventListener('mouseleave', function () { set(false); });
    document.addEventListener('click', function () { set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') set(false); });
    about.parentNode.insertBefore(dd, about.nextSibling);
  }

  function mobile(list) {
    if (list.querySelector('.ms-tog')) return;
    var about = aboutLink(list);
    if (!about) return;
    var panelBox = list.closest('.m-nav'); // service pages: let the whole menu scroll on short screens
    if (panelBox) panelBox.style.overflowY = 'auto';
    var tog = document.createElement('button'); tog.type = 'button'; tog.className = 'ms-tog';
    tog.setAttribute('aria-expanded', 'false');
    copy(about, tog, ['display', 'width', 'fontFamily', 'fontSize', 'fontWeight', 'letterSpacing', 'color', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight', 'borderBottomWidth', 'borderBottomStyle', 'borderBottomColor', 'textAlign', 'lineHeight', 'justifyContent', 'alignItems', 'gap']);
    if (getComputedStyle(about).display === 'flex') tog.style.display = 'flex';
    var num = about.querySelector('span');
    var label = document.createElement('span');
    if (num) {
      var n = num.cloneNode(true);
      copy(num, n, ['color', 'fontSize', 'fontFamily', 'letterSpacing', 'marginRight']);
      tog.appendChild(n);
    }
    tog.appendChild(txt(label, LABEL[0], LABEL[1]));
    if (onService) tog.style.color = '#c9a06a';
    var box = document.createElement('div'); box.className = 'ms-list';
    var align = getComputedStyle(about).textAlign;
    box.style.textAlign = align;
    ITEMS.forEach(function (i) {
      var a = document.createElement('a'); a.className = 'ms-msub' + (i[2] === path ? ' ms-on' : ''); a.href = i[2];
      box.appendChild(txt(a, i[0], i[1]));
    });
    function fit() {
      // if the opened menu no longer fits the screen, let it scroll from the top instead of clipping
      list.style.justifyContent = ''; list.style.overflowY = '';
      if (list.scrollHeight > list.clientHeight + 1) { list.style.justifyContent = 'flex-start'; list.style.overflowY = 'auto'; }
    }
    tog.addEventListener('click', function () {
      var o = tog.getAttribute('aria-expanded') !== 'true';
      tog.setAttribute('aria-expanded', o ? 'true' : 'false');
      box.classList.toggle('open', o);
      setTimeout(fit, 380);
    });
    window.addEventListener('resize', fit);
    about.parentNode.insertBefore(box, about.nextSibling);
    about.parentNode.insertBefore(tog, box);
    // renumber 01, 02, ... if the menu uses numbers
    if (num) {
      var i = 0;
      Array.prototype.forEach.call(list.children, function (c) {
        var sp = (c.tagName === 'A' || c === tog) ? c.querySelector(':scope > span') : null;
        if (sp && /^\d+$/.test(sp.textContent.trim())) { i++; sp.textContent = (i < 10 ? '0' : '') + i; }
      });
    }
    if (onService) { tog.setAttribute('aria-expanded', 'true'); box.classList.add('open'); }
    setTimeout(fit, 0);
  }

  function run() {
    css();
    Array.prototype.forEach.call(document.querySelectorAll('.d-nav'), desktop);
    Array.prototype.forEach.call(document.querySelectorAll('.nav-links, .m-links'), mobile);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  window.addEventListener('load', run); // desktop.js builds its nav on load on some pages
  window.addEventListener('langchange', relabel);
})();
