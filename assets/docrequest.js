/* Climate Sprints — document request helper.
   Two jobs, both small.

   1. A "Request the allocator edition" button carries data-doc-request. Clicking
      it ticks the matching checkbox in the form below, then lets the anchor do
      the scrolling. The form has a lot in it; arriving at it with your choice
      already made removes the step where you hunt for the right box.

   2. A link from another page can carry ?doc=allocator or ?doc=founder. On load
      we tick that box and scroll to the form, so the same behaviour works across
      pages as well as within one.

   Either way the box is only ticked, never unticked — someone who wants both
   ticks the second one themselves, which is the point. */
(function () {
  var MAP = {
    allocator: 'method-allocator',
    founder: 'method-founder',
    sample: 'sample-assessment'
  };

  function box(value) {
    return document.querySelector('input[name="interest"][value="' + value + '"]');
  }

  function tick(value, flash) {
    var el = box(value);
    if (!el || el.checked) return el;
    el.checked = true;
    el.dispatchEvent(new Event('change', { bubbles: true }));
    if (flash) {
      var row = el.closest('.check') || el.parentNode;
      if (row) {
        row.style.transition = 'background-color .9s ease';
        row.style.backgroundColor = 'rgba(190,36,55,.10)';
        setTimeout(function () { row.style.backgroundColor = ''; }, 1400);
      }
    }
    return el;
  }

  /* The updates consent appears only once a document has been asked for, so it is
     never a box in a long list that nobody read. It is NOT pre-ticked: consent has
     to be an affirmative act, and a box you have to untick is not one. */
  function syncConsent() {
    var row = document.querySelector('[data-doc-consent]');
    if (!row) return;
    var wanted = ['method-allocator', 'method-founder', 'sample-assessment'].some(function (v) {
      var b = box(v);
      return b && b.checked;
    });
    if (wanted === !row.hasAttribute('hidden')) return;
    if (wanted) {
      row.removeAttribute('hidden');
    } else {
      var c = row.querySelector('input[type="checkbox"]');
      if (c) c.checked = false;          // asked, changed their mind, consent goes too
      row.setAttribute('hidden', '');
    }
  }

  document.addEventListener('change', function (e) {
    if (e.target && e.target.name === 'interest') syncConsent();
  });

  document.addEventListener('click', function (e) {
    var t = e.target.closest && e.target.closest('[data-doc-request]');
    if (!t) return;
    tick(t.getAttribute('data-doc-request'), true);
    syncConsent();
    // the href="#request" anchor handles the scroll; nothing to prevent
  });

  syncConsent();   // a page restored from history may already have boxes ticked

  var want = new URLSearchParams(location.search).get('doc');
  if (want && MAP[want]) {
    var el = tick(MAP[want], true);
    syncConsent();
    if (el) {
      var anchor = document.getElementById('request') || el;
      setTimeout(function () {
        anchor.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }
})();
