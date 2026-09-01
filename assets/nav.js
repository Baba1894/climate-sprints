/* Climate Sprints — mobile navigation tray. */
(function () {
  var burger = document.querySelector('.burger');
  var nav    = document.getElementById('site-nav');
  var scrim  = document.querySelector('.nav-scrim');
  if (!burger || !nav) return;

  function open()  {
    document.body.classList.add('nav-open');
    burger.setAttribute('aria-expanded', 'true');
    if (scrim) scrim.hidden = false;
  }
  function close() {
    document.body.classList.remove('nav-open');
    burger.setAttribute('aria-expanded', 'false');
    if (scrim) scrim.hidden = true;
  }
  function toggle(){ document.body.classList.contains('nav-open') ? close() : open(); }

  burger.addEventListener('click', toggle);
  if (scrim) scrim.addEventListener('click', close);
  nav.addEventListener('click', function (e) { if (e.target.tagName === 'A') close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  window.addEventListener('resize', function () { if (window.innerWidth > 860) close(); });
})();

/* contact.html?i=<value> pre-checks the matching interest box */
(function () {
  var want = new URLSearchParams(location.search).get('i');
  if (!want) return;
  var box = document.querySelector('input[name="interest"][value="' + want + '"]');
  if (!box) return;
  box.checked = true;
  box.closest('.check').scrollIntoView({ block: 'center' });
})();
