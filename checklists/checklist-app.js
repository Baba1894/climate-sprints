/* Climate Sprints — interactive checklists, v1.1.
   Everything happens in the browser. Nothing is sent anywhere, nothing is stored,
   and the page has no form post. The filled PDF is produced client-side by writing
   into the AcroForm fields of the same file the /checklists page links to, so the
   printed and the on-screen versions stay identical by construction. */
(function () {
  var PDFLIB = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';

  var DATA = {
    momentum: {
      name: 'Momentum Sprint',
      title: 'Does anyone have to buy it?',
      lede: 'Fifteen lines about who buys, whose budget pays, what forces them to act, whether the cost case survives without a subsidy, and who owns the buyer relationship.',
      pdf: 'checklists/Climate_Sprints_Momentum-Sprint-checklist_v1.0.pdf',
      file: 'Climate-Sprints-Momentum-checklist-completed.pdf',
      page: 'momentum.html',
      pageLabel: 'About Momentum Sprints',
      groups: [
        ['Who buys', 'CC-1 · named buyer', [
          ['CC-1', 'We describe our market as a category or a TAM figure rather than as named organizations.'],
          ['CC-1', 'I can name interested parties, but I cannot name the individual who would actually sign.'],
          ['CC-1', 'Our strongest customer document is an LOI or MOU that we describe, in the deck, as an offtake.']]],
        ['Whose money', 'CC-2 · budget line', [
          ['CC-2', 'I do not know which budget line pays for us, or in which period it is available.'],
          ['CC-2', 'I cannot name the approval threshold above which our purchase needs a different signature.']]],
        ['Why now', 'CC-3 · trigger', [
          ['CC-3', 'I cannot name a date by which our buyer must act, only a period in which they might.'],
          ['CC-3', 'The regulation or deadline we cite compels someone other than the person who pays us.']]],
        ['Whether it survives', 'CC-4 · unsubsidized cost case', [
          ['CC-4', 'Our cost case depends on a credit, grant or mandate whose expiry date we have not modeled.'],
          ['CC-4', 'I have not calculated the price at which our case stops working.']]],
        ['What they stop doing', 'CC-5 · displacement friction', [
          ['CC-5', 'I do not know what our buyer has to stop doing, or what that costs them.'],
          ['CC-5', 'We have assumed the procurement cycle length rather than measured it with a buyer.']]],
        ['Who is selling', 'EC-2 · orientation shift', [
          ['EC-2', 'The founder owns every buyer conversation of consequence.'],
          ['EC-2', 'We have a commercial hire who has closed nothing, and the relationships have not transferred.'],
          ['EC-2', 'Our positioning describes what the technology does rather than what the buyer stops paying for.'],
          ['EC-2', 'Our price was set from our cost rather than from the value we displace.']]]
      ],
      bands: [
        [0, 2, 'Not your binding constraint.',
         'The commercial motion is not what is holding this back. Something else is, and spending three months here would be spending it in the wrong place. Try the router, or the alignment checklist.'],
        [3, 5, 'Fixable internally, by a team that will actually do it.',
         'Take the weakest lines you ticked, assign each an owner and a date, and run this again in a quarter. If the same lines are still ticked then, they are structural rather than situational and the answer changes.'],
        [6, 9, 'A Momentum Sprint is the instrument.',
         'The technology is not the problem and more capital will not reach the buyer. Three months, named-buyer segmentation with the trigger and budget line identified for each, and a go-to-market plan tied to the next capital event rather than to the calendar. The three lines worth fixing first are always CC-3, CC-2 and EC-2, in that order.'],
        [10, 15, 'This may not be a go-to-market problem at all.',
         'A company that ticks ten of these usually does not have an undated buyer. It has no compelled buyer, which is a timing bet and should be sized as one. That is a diligence question before it is a Momentum question, and it is a cheaper conversation to have now than after the next round.']
      ]
    },

    alignment: {
      name: 'Alignment Sprint',
      title: 'The execution risk more capital cannot fix.',
      lede: 'Fifteen lines about how a leadership team behaves under pressure — what gets avoided, what gets deferred, what gets heard, who is in the room and what the board actually receives.',
      pdf: 'checklists/Climate_Sprints_Alignment-Sprint-checklist_v1.0.pdf',
      file: 'Climate-Sprints-Alignment-checklist-completed.pdf',
      page: 'alignment.html',
      pageLabel: 'About Alignment Sprints',
      groups: [
        ['What gets avoided', 'EC-4 · conflict metabolism', [
          ['EC-4', 'There is a disagreement between founders that has been running longer than six months.'],
          ['EC-4', 'There is a topic we do not raise in meetings, and everyone knows which one it is.'],
          ['EC-4', 'Our last real disagreement ended by deferral rather than by decision.'],
          ['EC-4', 'We have no written mechanism for who decides when we cannot agree.']]],
        ['What gets deferred', 'EC-6 · decision behavior', [
          ['EC-6', 'A strategic decision has stayed open across two or more board cycles.'],
          ['EC-6', 'We are funding two directions at the scale of neither.'],
          ['EC-6', 'Decisions get made in the room and quietly unmade afterward.']]],
        ['What gets heard', 'EC-3 · blind-spot permeability', [
          ['EC-3', 'Nobody on the team has told me something I did not want to hear in the last quarter.'],
          ['EC-3', 'When a stated position is challenged, my first move is to defend it rather than to test it.'],
          ['EC-3', 'I could not name the thing my co-founder thinks I am wrong about.']]],
        ['Who is in the room', 'EC-5 · cohesion and hiring integrity', [
          ['EC-5', 'Our last three hires were selected on capability, with working-style fit assessed informally or not at all.'],
          ['EC-5', 'Two or more people have left voluntarily in the last eighteen months.'],
          ['EC-5', 'Roles became ambiguous after the last raise and have not been reset.']]],
        ['What the board gets', 'EC-7 · governance permeability', [
          ['EC-7', 'The board receives bad news with the numbers rather than before them.'],
          ['EC-7', 'I would not tell my lead investor about a slip until I had a fix to present alongside it.']]]
      ],
      bands: [
        [0, 2, 'Not your constraint.',
         'A team that ticks two of these is functioning. Look at the commercial checklist instead, or run the router.'],
        [3, 5, 'Worth naming out loud at the next offsite.',
         'One person accountable for each. If the same lines are still ticked in two quarters, they are structural rather than situational, and structural is what an Alignment Sprint is for.'],
        [6, 10, 'An Alignment Sprint is the instrument.',
         'These patterns do not resolve with more runway and they get more expensive as the stakes rise. Three months, individual and collective sessions sequenced, opening with an assessment of where the friction actually sits — which is rarely where the fund thinks it sits. Individual session content stays confidential; what a fund receives is a position on whether the execution risk has moved.'],
        [11, 15, 'Do this before the next raise, not after.',
         'A round changes the org. New capital, new expectation, a new board seat — and every line you ticked gets harder to work on once they are in the room. A count this high is not a disclosure problem. Every company that has raised has some version of this list; the ones that fail are the ones where nobody counted.']
      ]
    },

    mastermind: {
      name: 'Climate Catalyst Mastermind',
      title: 'Is there anyone you can say the honest version to?',
      lede: 'Twelve lines about isolation rather than capability — who you can actually say it to, what goes unsaid, whether anyone is three months ahead of you, and what it is costing in decisions.',
      pdf: 'checklists/Climate_Sprints_Climate-Catalyst-Mastermind-checklist_v1.0.pdf',
      file: 'Climate-Sprints-Mastermind-checklist-completed.pdf',
      page: 'mastermind.html',
      pageLabel: 'Climate Catalyst Mastermind',
      groups: [
        ['The room you are in', 'EC-7 · governance permeability', [
          ['EC-7', 'My board wants confidence, my team wants certainty, and I calibrate what I say for both.'],
          ['EC-7', 'There is nobody in the building to whom the honest version of the week can be said out loud.'],
          ['EC-7', 'The people I discuss the company with are, in one way or another, paid to be reassuring.']]],
        ['What goes unsaid', 'EC-3 · blind-spot permeability', [
          ['EC-3', 'I have made a decision in the last quarter I would not want to describe to a peer in detail.'],
          ['EC-3', 'I have no forum where being wrong is cheap.'],
          ['EC-3', 'The last time I changed my mind on something significant, nobody else was in the room.']]],
        ['Who is ahead of you', 'peer proximity', [
          ['', 'I have no peer who is three months ahead of me on the same problem.'],
          ['', 'The advice I get is generic because the people giving it have not run this kind of company.'],
          ['', 'I learn more from one honest founder conversation than from a month of scheduled advisory.']]],
        ['What it is costing', 'decision quality', [
          ['', 'I am slower to decide than I was a year ago, and I do not think that is caution.'],
          ['', 'I have repeated a mistake that someone one stage ahead of me would have named immediately.'],
          ['', 'I would find it useful to hear how three other CEOs handled the thing in front of me, and I have no way to.']]]
      ],
      bands: [
        [0, 2, 'You have a room already.',
         'Keep it, and be careful about what would break it. The thing that usually breaks it is a raise.'],
        [3, 5, 'Normal for a first-time CEO with a functioning board.',
         'Worth finding two peers deliberately rather than waiting to meet them. The cohort is one way; it is not the only way.'],
        [6, 9, 'The cohort is the room.',
         'Twelve weeks, twelve sessions, three hot seats each so every member gets the room repeatedly, and a closed environment between sessions. Curated for stage overlap and sector spread — enough common ground to be useful, enough difference to be worth the time. Every seat is by application.'],
        [10, 12, 'This has already cost you something.',
         'Isolation at this level shows up as deferred decisions and repeated mistakes long before it shows up as a milestone slip, which is why it is almost never the thing that gets diagnosed. If you are a fund reading this: run it past the CEO rather than about them.']
      ]
    }
  };

  var slug = new URLSearchParams(location.search).get('c') || 'momentum';
  if (!DATA[slug]) slug = 'momentum';
  var D = DATA[slug], items = [], ticked = {};

  D.groups.forEach(function (g) { g[2].forEach(function (it) { items.push(it); }); });

  var root = document.getElementById('cl-app');
  if (!root) return;

  document.title = D.title + ' — Climate Sprints';
  var h = document.getElementById('cl-h1'); if (h) h.textContent = D.title;
  var l = document.getElementById('cl-lede'); if (l) l.textContent = D.lede;
  var e = document.getElementById('cl-eyebrow');
  if (e) e.textContent = D.name + ' checklist · ' + items.length + ' lines';

  // ── tabs so the other two are one click away
  var tabs = Object.keys(DATA).map(function (k) {
    return '<a class="cl-tab' + (k === slug ? ' on' : '') + '" href="?c=' + k + '">' +
      DATA[k].name + '</a>';
  }).join('');

  var n = 0;
  var body = D.groups.map(function (g) {
    return '<p class="cl-group">' + g[0] + ' <span>— ' + g[1] + '</span></p>' +
      g[2].map(function (it) {
        var i = n++;
        return '<label class="cl-row"><input type="checkbox" data-i="' + i + '">' +
          '<span class="cl-box" aria-hidden="true"></span>' +
          '<span class="cl-text">' + it[1] + '</span>' +
          '<span class="cl-ref">' + it[0] + '</span></label>';
      }).join('');
  }).join('');

  root.innerHTML =
    '<div class="cl-tabs">' + tabs + '</div>' +
    '<p class="cl-rule">Tick a line if it is <b>true of you today</b>, not if you aspire to it. ' +
    'A tick is a gap, not an achievement.</p>' +
    '<div class="cl-items">' + body + '</div>' +
    '<div class="cl-bar"><span class="cl-count" id="cl-count">0 of ' + items.length +
    ' ticked</span><button class="btn" type="button" id="cl-go">Show me what that means</button></div>' +
    '<div class="cl-result" id="cl-result" hidden></div>';

  var countEl = document.getElementById('cl-count');
  var result = document.getElementById('cl-result');

  root.addEventListener('change', function (ev) {
    var b = ev.target;
    if (!b || b.type !== 'checkbox') return;
    ticked[b.getAttribute('data-i')] = b.checked;
    var c = count();
    countEl.textContent = c + ' of ' + items.length + ' ticked';
  });

  function count() {
    return Object.keys(ticked).filter(function (k) { return ticked[k]; }).length;
  }

  function band(c) {
    for (var i = 0; i < D.bands.length; i++) {
      if (c >= D.bands[i][0] && c <= D.bands[i][1]) return D.bands[i];
    }
    return D.bands[D.bands.length - 1];
  }

  document.getElementById('cl-go').addEventListener('click', function () {
    var c = count(), b = band(c);
    var list = items.map(function (it, i) {
      return ticked[i] ? '<li>' + it[1] + (it[0] ? ' <span class="cl-ref-in">' + it[0] + '</span>' : '') + '</li>' : '';
    }).join('');

    result.innerHTML =
      '<span class="cl-kicker">' + c + ' of ' + items.length + '</span>' +
      '<h3>' + b[2] + '</h3>' +
      '<p>' + b[3] + '</p>' +
      (c ? '<div class="cl-gaps"><p class="cl-gaps-h">What you ticked</p><ul>' + list + '</ul></div>' : '') +
      '<div class="cl-links">' +
        '<a class="btn" href="https://calendly.com/marcstrauch" target="_blank" rel="noopener noreferrer">Book thirty minutes</a>' +
        '<button class="btn btn-ghost btn-sm" type="button" id="cl-pdf">Download your completed PDF</button>' +
        '<a class="btn btn-ghost btn-sm" href="' + D.page + '">' + D.pageLabel + '</a>' +
      '</div>' +
      '<p class="cl-small">Nothing here was sent anywhere. The count is not recorded, the answers are ' +
      'not stored, and this page has no form. If you want a second opinion on it, the thirty minutes ' +
      'is the way to get one.</p>' +
      '<p class="cl-small"><b>This is not an assessment.</b> A checklist tells you which instrument ' +
      'you need. An assessment answers whether a position should be taken, at what size, against ' +
      'what reserve — across twenty-four scored dimensions, each carrying an evidence grade. ' +
      '<a class="link" href="method.html">The method</a>.</p>';

    result.hidden = false;
    document.getElementById('cl-pdf').addEventListener('click', makePdf);
    if (result.scrollIntoView) result.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ── write the ticks into the real PDF, in the browser
  function loadPdfLib() {
    return new Promise(function (res, rej) {
      if (window.PDFLib) return res(window.PDFLib);
      var s = document.createElement('script');
      s.src = PDFLIB;
      s.onload = function () { res(window.PDFLib); };
      s.onerror = function () { rej(new Error('pdf-lib did not load')); };
      document.head.appendChild(s);
    });
  }

  function makePdf() {
    var btn = document.getElementById('cl-pdf');
    var was = btn.textContent;
    btn.textContent = 'Building…'; btn.disabled = true;

    loadPdfLib()
      .then(function (lib) {
        return fetch(D.pdf).then(function (r) {
          if (!r.ok) throw new Error('checklist PDF not found');
          return r.arrayBuffer();
        }).then(function (buf) { return lib.PDFDocument.load(buf); });
      })
      .then(function (doc) {
        var form = doc.getForm();
        items.forEach(function (_, i) {
          if (!ticked[i]) return;
          var nm = 'item' + String(i + 1).padStart(2, '0');
          try { form.getCheckBox(nm).check(); } catch (err) { /* field absent, skip */ }
        });
        return doc.save();
      })
      .then(function (bytes) {
        var blob = new Blob([bytes], { type: 'application/pdf' });
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = D.file;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        btn.textContent = was; btn.disabled = false;
      })
      .catch(function (err) {
        console.error(err);
        btn.textContent = 'Download the blank PDF instead';
        btn.disabled = false;
        btn.onclick = function () { window.open(D.pdf, '_blank'); };
      });
  }
})();
