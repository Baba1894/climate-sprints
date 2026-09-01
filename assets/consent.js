/* Climate Sprints — consent gate.
   GA4 does not load until the visitor accepts. Declining is one click, same as
   accepting. The choice is stored locally and can be changed from the footer. */
(function () {
  var KEY = 'cs-consent';
  var GA_ID = 'G-XXXXXXXXXX';           // <-- replace with the real GA4 measurement ID
  var banner;

  function read()  { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function write(v){ try { localStorage.setItem(KEY, v); } catch (e) {} }

  function loadAnalytics() {
    if (window.__csGA || GA_ID.indexOf('X') > -1) return;   // no-op until a real ID is set
    window.__csGA = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag(){ dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', GA_ID, { anonymize_ip: true });
  }

  function close() { if (banner) { banner.remove(); banner = null; } }

  function show() {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie choice');
    banner.innerHTML =
      '<div class="wrap consent-in">' +
        '<p class="consent-copy">We use analytics cookies only if you say so. Nothing loads before you choose, ' +
        'and you can change your mind at any time. <a class="link" href="privacy.html">Privacy notice</a></p>' +
        '<div class="consent-actions">' +
          '<button type="button" data-consent="denied">Decline</button>' +
          '<button type="button" data-consent="granted">Accept analytics</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(banner);
    banner.addEventListener('click', function (e) {
      var v = e.target.getAttribute && e.target.getAttribute('data-consent');
      if (!v) return;
      write(v);
      if (v === 'granted') loadAnalytics();
      close();
    });
  }

  var choice = read();
  if (choice === 'granted') loadAnalytics();
  else if (choice !== 'denied') show();

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-consent-reopen]');
    if (!t) return;
    e.preventDefault();
    try { localStorage.removeItem(KEY); } catch (err) {}
    show();
  });
})();
