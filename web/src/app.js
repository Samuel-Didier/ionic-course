/* ============================================================
   Ionic 9 — cours express · application (vanilla, sans build)
   Rendu : hash-routing (#/, #/fiche, #/quiz) → fonctionne
   depuis n'importe quel sous-chemin de GitHub Pages et en file://
   ============================================================ */
(function () {
  'use strict';

  var COURSE = window.COURSE || { chapters: [], groups: [], counts: {} };
  var QUIZ = window.QUIZ || [];
  var chapters = COURSE.chapters || [];
  var KEY = 'ionic-course:v1';
  var RING = 113; /* 2πr, r = 18 */

  /* ---------------- état persistant ---------------- */
  var state = load();

  function load() {
    var base = { theme: 'dark', read: {}, checks: {}, quiz: {}, scroll: {}, last: null };
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (raw && typeof raw === 'object') {
        ['read', 'checks', 'quiz', 'scroll'].forEach(function (k) {
          base[k] = (raw[k] && typeof raw[k] === 'object') ? raw[k] : {};
        });
        base.theme = (raw.theme === 'light' || raw.theme === 'dark') ? raw.theme : 'dark';
        base.last = typeof raw.last === 'string' ? raw.last : null;
      }
    } catch (e) { /* stockage indisponible : on reste en mémoire */ }
    return base;
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* mode privé */ }
  }

  /* ---------------- DOM ---------------- */
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var view = $('#view');
  var toc = $('#toc');
  var nav = $('#nav');
  var pager = $('#pager');
  var readBar = $('#read-bar');

  var current = null;        /* chapitre affiché */
  var currentRoute = 'home';
  var observer = null;       /* IntersectionObserver du TOC */
  var autoMarked = false;    /* marquage auto "lue" sur cette fiche */
  var search = { q: '', items: [], sel: 0 };
  var toastTimer = null;

  /* ---------------- utilitaires ---------------- */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
  function byId(id) {
    for (var i = 0; i < chapters.length; i++) if (chapters[i].id === id) return chapters[i];
    return null;
  }
  function neighbours(ch) {
    var i = chapters.indexOf(ch);
    return { prev: i > 0 ? chapters[i - 1] : null, next: i > -1 && i < chapters.length - 1 ? chapters[i + 1] : null };
  }
  function isRead(id) { return !!state.read[id]; }
  function checkKey(id, i) { return id + ':' + i; }
  function toast(msg) {
    var t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    requestAnimationFrame(function () { t.classList.add('show'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      t.classList.remove('show');
      setTimeout(function () { t.hidden = true; }, 220);
    }, 2200);
  }
  function progress() {
    var total = chapters.length;
    var done = chapters.filter(function (c) { return c.isHome || isRead(c.id); }).length;
    var checks = 0, allChecks = 0;
    chapters.forEach(function (c) {
      c.checkpoint.forEach(function (_, i) { allChecks++; if (state.checks[checkKey(c.id, i)]) checks++; });
    });
    var answered = QUIZ.filter(function (q) { return state.quiz[q.id] !== undefined; }).length;
    var correct = QUIZ.filter(function (q) { return state.quiz[q.id] === q.answer; }).length;
    return { total: total, done: done, pct: total ? Math.round((done / total) * 100) : 0, checks: checks, allChecks: allChecks, answered: answered, correct: correct };
  }
  function setTheme(t) {
    state.theme = t;
    document.documentElement.dataset.theme = t;
    save();
  }

  /* ---------------- sidebar + anneau de progression ---------------- */
  function renderNav() {
    var p = progress();
    var html = COURSE.groups.map(function (g) {
      var items = chapters.filter(function (c) { return c.group === g; });
      if (!items.length) return '';
      var links = items.map(function (c) {
        var cls = [current === c ? 'active' : '', isRead(c.id) ? 'done' : ''].filter(Boolean).join(' ');
        return '<a href="#/' + c.id + '"' + (cls ? ' class="' + cls + '"' : '') + ' data-id="' + c.id + '">' +
          '<span class="num">' + esc(c.num) + '</span>' +
          '<span class="lbl">' + esc(c.title.replace(/^Ionic 9 — /, '')) + '</span>' +
          '<span class="dot" aria-hidden="true"></span>' +
          '<span class="min">' + (c.isHome ? '—' : c.minutes + '′') + '</span>' +
          '</a>';
      }).join('');
      return '<div class="nav-group"><h3>' + esc(g) + '</h3>' + links + '</div>';
    }).join('');
    nav.innerHTML = html +
      '<div class="nav-group"><h3>Entraînement</h3>' +
      '<a href="#/quiz"' + (currentRoute === 'quiz' ? ' class="active"' : '') + ' data-id="quiz">' +
      '<span class="num">?</span><span class="lbl">Quiz final</span>' +
      '<span class="dot" aria-hidden="true">' + (p.answered === QUIZ.length && QUIZ.length ? '✓' : '') + '</span>' +
      '<span class="min">' + p.correct + '/' + QUIZ.length + '</span></a></div>';

    $('#pct-label').textContent = p.pct + ' %';
    $('#read-label').textContent = p.done + ' / ' + p.total + ' fiches · ' + p.checks + '/' + p.allChecks + ' checkpoints';
    var ring = $('#ring-fg');
    ring.style.strokeDasharray = RING;
    ring.style.strokeDashoffset = String(RING * (1 - p.pct / 100));
  }

  /* ---------------- page d'accueil ---------------- */
  function renderHome() {
    var p = progress();
    var c = COURSE.counts || {};
    var next = chapters.filter(function (x) { return !x.isHome && !isRead(x.id); })[0] || chapters[1];
    var quizPct = QUIZ.length ? Math.round((p.correct / QUIZ.length) * 100) : 0;

    var cards = COURSE.groups.map(function (g) {
      var items = chapters.filter(function (c2) { return c2.group === g; });
      if (!items.length) return '';
      return '<h2 class="group-title">' + esc(g) + '</h2><div class="grid-cards">' + items.map(function (c2) {
        var desc = c2.isHome ? 'Programme, méthode et commandements du cours.'
          : c2.checkpoint.length ? 'Checkpoint : ' + c2.checkpoint[0].slice(0, 92) + (c2.checkpoint[0].length > 92 ? '…' : '')
            : c2.text.slice(0, 110).replace(/\s+\S*$/, '') + '…';
        return '<a class="chapter-card' + (isRead(c2.id) ? ' done' : '') + '" href="#/' + c2.id + '">' +
          '<span class="cc-top">' + esc(c2.num) + (c2.isHome ? '' : ' · ' + c2.minutes + ' min') + '</span>' +
          '<h3>' + esc(c2.title) + '</h3><p>' + esc(desc) + '</p>' +
          '<span class="cc-meta">📖 ' + c2.words + ' mots' + (c2.checkpoint.length ? ' · ✅ ' + c2.checkpoint.length + ' check' : '') + '</span>' +
          '</a>';
      }).join('') + '</div>';
    }).join('');

    view.innerHTML =
      '<section class="hero">' +
      '<h1>Ionic <b>9</b>, de zéro à l’app native<br />en 9 fiches.</h1>' +
      '<p class="lead">Cours express Ionic 9 · Angular 22 · Capacitor 8 — avec un fil rouge (Photo Gallery), ' +
      'des checklists de validation, un quiz final et une recherche plein texte. Tout est statique : déployable sur GitHub Pages.</p>' +
      '<div class="hero-actions">' +
      '<a class="btn" href="#/' + next.id + '">' + (p.done > 1 ? 'Reprendre : ' + esc(next.num) + ' ' + esc(next.title) : 'Commencer le cours') + ' →</a>' +
      '<a class="btn ghost" href="#/quiz">Quiz final (' + p.correct + '/' + QUIZ.length + ')</a>' +
      '<a class="btn ghost" href="#/90-cheatsheet">Cheatsheet</a>' +
      '</div>' +
      '<div class="stats">' +
      '<div class="stat"><b>' + (c.chapters || 0) + '</b><span>fiches</span></div>' +
      '<div class="stat"><b>' + (c.minutes || 0) + '′</b><span>de lecture</span></div>' +
      '<div class="stat"><b>' + (c.words || 0).toLocaleString('fr-FR') + '</b><span>mots</span></div>' +
      '<div class="stat"><b>' + (c.checkpoints || 0) + '</b><span>checkpoints</span></div>' +
      '<div class="stat"><b>' + p.pct + ' %</b><span>progression</span></div>' +
      '</div></section>' +
      '<div class="card"><b>Comment travailler :</b> lire la fiche (5–10 min) → coder l’atelier → cocher le checkpoint. ' +
      'Les checklists ci-dessous et le quiz mémorisent ta progression dans ce navigateur (localStorage, rien n’est envoyé).</div>' +
      cards +
      '<h2 class="group-title">Entraînement</h2>' +
      '<div class="grid-cards">' +
      '<a class="chapter-card' + (p.answered ? ' done' : '') + '" href="#/quiz"><span class="cc-top">QUIZ · ' + QUIZ.length + ' questions</span>' +
      '<h3>Quiz final</h3><p>10 questions à choix multiple avec explication immédiate. Score : <b>' + p.correct + '/' + QUIZ.length + '</b> (' + quizPct + ' %).</p>' +
      '<span class="cc-meta">🎯 seuil de réussite : 8/10</span></a>' +
      '<a class="chapter-card" href="#/92-atelier-fil-rouge"><span class="cc-top">ATELIER · ~2 h</span>' +
      '<h3>Défi final « Liste de rappels »</h3><p>Un écran complet de A à Z, sans fiche, avec grille d’évaluation sur 10 points.</p>' +
      '<span class="cc-meta">🎓 10 ateliers progressifs avant</span></a>' +
      '</div>';

    buildTOC(null);
    toc.innerHTML = '<h4>Progression</h4>' + chapters.map(function (c) {
      return '<a class="lvl3" href="#/' + c.id + '"' + (isRead(c.id) ? ' style="color:var(--ok)"' : '') + '>' +
        (isRead(c.id) ? '✓ ' : '· ') + esc(c.num + ' ' + c.title) + '</a>';
    }).join('');
  }

  /* ---------------- fiche ---------------- */
  function renderChapter(ch) {
    var idx = chapters.indexOf(ch);
    var checks = ch.checkpoint.map(function (text, i) {
      var key = checkKey(ch.id, i);
      var done = !!state.checks[key];
      return '<li class="' + (done ? 'done' : '') + '"><input type="checkbox" id="ck-' + i + '" data-check="' + i + '"' +
        (done ? ' checked' : '') + '><label for="ck-' + i + '">' + esc(text) + '</label></li>';
    }).join('');
    var doneChecks = ch.checkpoint.filter(function (_, i) { return state.checks[checkKey(ch.id, i)]; }).length;

    view.innerHTML =
      '<header class="chapter-head">' +
      '<div class="eyebrow"><span class="badge">' + (ch.isHome ? 'Accueil' : 'Fiche ' + esc(ch.num)) + '</span>' +
      '<span>' + esc(ch.group) + '</span><span>~' + ch.minutes + ' min</span><span>' + ch.words.toLocaleString('fr-FR') + ' mots</span></div>' +
      '<h1>' + esc(ch.title) + '</h1>' +
      '<div class="chapter-actions">' +
      (ch.isHome ? '' : '<button class="btn ' + (isRead(ch.id) ? 'ghost' : 'ok') + '" data-act="toggle-read">' + (isRead(ch.id) ? '✓ Fiche lue' : 'Marquer comme lue') + ' <kbd>m</kbd></button>') +
      '<button class="btn ghost" data-act="filter-tables">Filtrer les tableaux <kbd>f</kbd></button>' +
      '<button class="btn ghost" data-act="print">Imprimer <kbd>p</kbd></button>' +
      '</div></header>' +
      (checks ? '<section class="checkpoint"><h2>✅ Checkpoint de validation <span class="count">' + doneChecks + ' / ' + ch.checkpoint.length + '</span></h2>' +
        '<ol>' + checks + '</ol>' +
        '<p class="why">Un critère binaire : « ça marche » ne compte pas. Ces cases sont mémorisées dans ton navigateur.</p></section>' : '') +
      '<div class="md">' + ch.html + '</div>';

    enhanceArticle(ch);
    buildTOC(ch.headings);

    var nb = neighbours(ch);
    pager.innerHTML =
      (nb.prev ? '<a class="prev" href="#/' + nb.prev.id + '"><small>← Précédente</small><b>' + esc(nb.prev.title) + '</b></a>' : '<span style="flex:1"></span>') +
      (nb.next ? '<a class="next" href="#/' + nb.next.id + '"><small>Suivante →</small><b>' + esc(nb.next.title) + '</b></a>' : '<span style="flex:1"></span>');
  }

  /* enrichit le HTML markdown : ancres de titres + filtres de tableaux */
  function enhanceArticle(ch) {
    $$('.md h2[id], .md h3[id]').forEach(function (h) {
      if ($('.anchor', h)) return;
      var a = document.createElement('span');
      a.className = 'anchor';
      a.textContent = '#';
      a.title = 'Copier le lien vers cette section';
      a.addEventListener('click', function () {
        var url = location.origin + location.pathname + '#/' + ch.id;
        if (navigator.clipboard) navigator.clipboard.writeText(url + '#' + h.id).catch(function () {});
        toast('Lien copié : #' + h.id);
      });
      h.appendChild(a);
    });

    $$('.md .table-wrap').forEach(function (wrap) {
      var table = $('table', wrap);
      if (!table || !table.tBodies[0] || table.tBodies[0].rows.length < 6) return;
      var box = document.createElement('div');
      box.className = 'table-filter';
      box.innerHTML = '<input type="search" placeholder="Filtrer ce tableau…" aria-label="Filtrer ce tableau"><span></span>';
      wrap.insertBefore(box, wrap.firstChild);
      var input = $('input', box);
      var count = $('span', box);
      var rows = table.tBodies[0].rows;
      function apply() {
        var q = input.value.trim().toLowerCase();
        var shown = 0;
        Array.prototype.forEach.call(rows, function (tr) {
          var hit = !q || tr.textContent.toLowerCase().indexOf(q) > -1;
          tr.classList.toggle('hidden', !hit);
          if (hit) shown++;
        });
        count.textContent = shown + ' / ' + rows.length + ' lignes';
        wrap.classList.toggle('filtered', !!q);
      }
      input.addEventListener('input', apply);
      apply();
    });
  }

  /* ---------------- TOC + scrollspy ---------------- */
  function buildTOC(headings) {
    if (!headings || !headings.length) { toc.innerHTML = ''; return; }
    toc.innerHTML = '<h4>Dans cette fiche</h4>' + headings.map(function (h) {
      return '<a href="#/' + (current ? current.id : '') + '" class="lvl' + h.level + '" data-goto="' + h.id + '">' + esc(h.text) + '</a>';
    }).join('');
    if (observer) observer.disconnect();
    var links = $$('a[data-goto]', toc);
    links.forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); goTo(a.getAttribute('data-goto')); });
    });
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = en.target.id;
        links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-goto') === id); });
      });
    }, { rootMargin: '-70px 0px -70% 0px' });
    $$('.md h2[id], .md h3[id]').forEach(function (h) { observer.observe(h); });
  }

  function goTo(id) {
    var target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ---------------- quiz ---------------- */
  function renderQuiz() {
    var p = progress();
    var pct = QUIZ.length ? Math.round((p.correct / QUIZ.length) * 100) : 0;
    var verdict = p.correct >= 8 ? 'Acquis 🎉 — le défi final t’attend.'
      : p.correct >= 5 ? 'Presque : relis 91-pieges-v9 puis refais le défi.'
        : 'Relis les fiches 02, 04 et 06 (elles portent 60 % des points), puis recommence.';

    var html =
      '<section class="hero"><h1>Quiz final <b>' + p.correct + '/' + QUIZ.length + '</b></h1>' +
      '<p class="lead">10 questions, explication immédiate. Seuil de réussite : 8/10. Tes réponses sont mémorisées dans ce navigateur.</p></section>' +
      '<div class="quiz-head"><div><div class="score">' + pct + ' %</div>' +
      '<p>' + p.answered + ' / ' + QUIZ.length + ' questions répondues · ' + p.correct + ' correcte(s)</p></div>' +
      '<div style="flex:1;min-width:180px"><div class="thermo"><i class="' + (p.correct ? '' : 'bad') + '" style="width:' + (QUIZ.length ? (p.correct / QUIZ.length) * 100 : 0) + '%"></i></div>' +
      '<p style="margin-top:8px">' + (p.answered ? esc(verdict) : 'Clique sur une réponse pour voir l’explication.') + '</p></div>' +
      '<button class="btn ghost" data-act="quiz-reset">Recommencer</button></div>';

    html += QUIZ.map(function (q, qi) {
      var chosen = state.quiz[q.id];
      var answered = chosen !== undefined;
      return '<section class="q' + (answered ? ' answered' : '') + '" id="' + q.id + '">' +
        '<h3><span class="qnum">' + String(qi + 1).padStart(2, '0') + '</span><span>' + esc(q.q) + '</span></h3>' +
        '<div class="opts">' + q.options.map(function (o, oi) {
          var cls = '';
          if (answered) {
            if (oi === q.answer) cls = ' correct';
            else if (oi === chosen) cls = ' wrong';
          }
          return '<label class="opt' + cls + '"><input type="radio" name="' + q.id + '" value="' + oi + '"' +
            (answered && chosen === oi ? ' checked' : '') + '><span>' + esc(o) + '</span></label>';
        }).join('') + '</div>' +
        (answered ? '<p class="explain"><b>' + (chosen === q.answer ? '✓ Correct' : '✕ Réponse : ' + esc(q.options[q.answer])) + '</b> — ' + esc(q.explain) +
          (q.ref ? ' <a href="' + esc(q.ref) + '">Revoir la fiche →</a>' : '') + '</p>' : '') +
        '</section>';
    }).join('');

    html += '<div class="card"><b>Rappel :</b> le vrai test est le <a href="#/92-atelier-fil-rouge">défi final</a> — un écran complet, sans fiche. ' +
      'Si une question t\'a piégé, va relire la fiche liée dans l\'explication : c\'est là que se trouve la règle.</div>';

    view.innerHTML = html;
    pager.innerHTML = '<a class="prev" href="#/"><small>← Retour</small><b>Accueil</b></a>' +
      '<a class="next" href="#/92-atelier-fil-rouge"><small>Suivant →</small><b>Défi final</b></a>';

    buildTOC(null);
    $$('.q').forEach(function (card) {
      $$('input[type=radio]', card).forEach(function (radio) {
        radio.addEventListener('change', function () {
          var id = card.id;
          state.quiz[id] = Number(radio.value);
          save();
          renderQuiz();
          renderNav();
          var again = document.getElementById(id);
          if (again) window.scrollTo({ top: again.getBoundingClientRect().top + window.scrollY - 90, behavior: 'smooth' });
        });
      });
    });
  }

  /* ---------------- recherche ---------------- */
  function openSearch() {
    var m = $('#search-modal');
    m.hidden = false;
    var f = $('#search-field');
    f.value = search.q;
    f.focus();
    f.select();
    runSearch(search.q);
  }
  function closeSearch() { $('#search-modal').hidden = true; }

  function runSearch(q) {
    search.q = q;
    var box = $('#search-results');
    var count = $('#search-count');
    var term = q.trim().toLowerCase();
    if (term.length < 2) {
      box.innerHTML = '<p class="empty">Tape au moins 2 caractères.<br /><span style="color:var(--ink-3)">Ex. <b>signal</b>, <b>modale</b>, <b>safe area</b>, <b>shadow</b>, <b>onDismiss</b></span></p>';
      count.textContent = '';
      search.items = [];
      return;
    }
    var terms = term.split(/\s+/).filter(Boolean);
    var results = [];
    chapters.forEach(function (c) {
      var lower = c.text.toLowerCase();
      var title = c.title.toLowerCase();
      var score = 0;
      var first = -1;
      terms.forEach(function (t) {
        var idx = lower.indexOf(t);
        if (idx > -1) {
          score += 3;
          if (first === -1 || idx < first) first = idx;
        }
        if (title.indexOf(t) > -1) score += 12;
        c.headings.forEach(function (h) { if (h.text.toLowerCase().indexOf(t) > -1) score += 6; });
        if (c.id.indexOf(t) > -1) score += 4;
      });
      if (score > 0 && first > -1) {
        var from = Math.max(0, first - 70);
        var snip = esc(c.text.slice(from, from + 210));
        terms.forEach(function (t) {
          snip = snip.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>');
        });
        results.push({ id: c.id, num: c.num, title: c.title, score: score, snip: (from > 0 ? '…' : '') + snip + '…' });
      }
    });
    results.sort(function (a, b) { return b.score - a.score; });
    search.items = results.slice(0, 14);
    search.sel = 0;
    count.textContent = results.length + ' résultat(s)';
    box.innerHTML = search.items.length
      ? search.items.map(function (r, i) {
        return '<a class="res' + (i === 0 ? ' sel' : '') + '" href="#/' + r.id + '" data-i="' + i + '">' +
          '<span class="res-top"><b>' + esc(r.num) + '</b>' + esc(r.title) + '</span>' +
          '<span class="res-snip">' + r.snip + '</span></a>';
      }).join('')
      : '<p class="empty">Aucun résultat pour « ' + esc(term) + ' ».</p>';
    $$('.res', box).forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        openResult(Number(a.getAttribute('data-i')));
      });
    });
  }

  function openResult(i) {
    var r = search.items[i];
    if (!r) return;
    var term = search.q.trim().split(/\s+/)[0];
    closeSearch();
    location.hash = '#/' + r.id;
    setTimeout(function () { jumpToTerm(term); }, 90);
  }

  function jumpToTerm(term) {
    if (!term) return;
    var t = term.toLowerCase();
    var walker = document.createTreeWalker(view, NodeFilter.SHOW_TEXT, null);
    var node;
    while ((node = walker.nextNode())) {
      var i = (node.nodeValue || '').toLowerCase().indexOf(t);
      if (i > -1 && node.parentElement && !node.parentElement.closest('.checkpoint, .code, kbd')) {
        var el = node.parentElement;
        el.classList.add('flash');
        setTimeout(function () { el.classList.remove('flash'); }, 1800);
        var top = el.getBoundingClientRect().top + window.scrollY - 120;
        window.scrollTo({ top: top, behavior: 'smooth' });
        return;
      }
    }
  }

  /* ---------------- routeur ---------------- */
  function parseHash() {
    var h = (location.hash || '').replace(/^#\/?/, '').trim();
    if (!h || h === 'index.html' || h === '/') return { name: 'home' };
    if (h === 'quiz') return { name: 'quiz' };
    return { name: 'chapter', id: h };
  }

  function render() {
    var r = parseHash();
    if (current && window.scrollY) state.scroll[current.id] = window.scrollY;
    currentRoute = r.name;

    if (observer) { observer.disconnect(); observer = null; }

    if (r.name === 'home') {
      current = null;
      renderHome();
      window.scrollTo(0, 0);
    } else if (r.name === 'quiz') {
      current = null;
      renderQuiz();
      window.scrollTo(0, 0);
    } else {
      var ch = byId(r.id);
      if (!ch) {
        current = null;
        view.innerHTML = '<section class="hero"><h1>Fiche introuvable</h1><p class="lead">« ' + esc(r.id) + ' » n’existe pas. <a href="#/">Retour à l\'accueil</a>.</p></section>';
        pager.innerHTML = '';
        toc.innerHTML = '';
      } else {
        current = ch;
        state.last = ch.id;
        save();
        renderChapter(ch);
        autoMarked = isRead(ch.id);
        var y = state.scroll[ch.id] || 0;
        requestAnimationFrame(function () { window.scrollTo(0, y); });
      }
    }
    renderNav();
    closeDrawer();
    updateBar();
  }

  function onScroll() {
    updateBar();
    if (current && !current.isHome && !autoMarked) {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      if (max > 200 && window.scrollY >= max * 0.97) {
        autoMarked = true;
        if (!isRead(current.id)) {
          state.read[current.id] = true;
          save();
          renderNav();
          var b = $('[data-act="toggle-read"]');
          if (b) { b.className = 'btn ghost'; b.innerHTML = '✓ Fiche lue <kbd>m</kbd>'; }
          toast('✔ Fiche ' + current.num + ' marquée comme lue');
        }
      }
    }
  }

  function updateBar() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var pct = max > 40 ? Math.min(100, Math.round((window.scrollY / max) * 100)) : 0;
    readBar.style.width = pct + '%';
  }

  /* ---------------- actions globales ---------------- */
  document.addEventListener('click', function (e) {
    var t = e.target;

    var copy = t.closest && t.closest('.code-copy');
    if (copy) {
      var code = $('code', copy.parentElement);
      var text = code ? code.textContent : '';
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(function () {
          copy.textContent = 'Copié ✓';
          copy.classList.add('done');
          setTimeout(function () { copy.textContent = 'Copier'; copy.classList.remove('done'); }, 1600);
        }).catch(function () { toast('Sélectionne le code manuellement'); });
      } else { toast('Clipboard indisponible'); }
      return;
    }

    var act = t.closest && t.closest('[data-act]');
    if (act) {
      var a = act.getAttribute('data-act');
      if (a === 'toggle-read' && current) {
        state.read[current.id] = !isRead(current.id);
        autoMarked = state.read[current.id];
        save();
        act.className = 'btn ' + (state.read[current.id] ? 'ghost' : 'ok');
        act.innerHTML = (state.read[current.id] ? '✓ Fiche lue' : 'Marquer comme lue') + ' <kbd>m</kbd>';
        renderNav();
        toast(state.read[current.id] ? 'Fiche marquée comme lue' : 'Fiche dé-marquée');
      } else if (a === 'filter-tables') {
        focusFirstTableFilter();
      } else if (a === 'print') {
        window.print();
      } else if (a === 'quiz-reset') {
        state.quiz = {}; save(); renderQuiz(); renderNav(); toast('Quiz réinitialisé');
      }
      return;
    }

    if (t.closest && t.closest('[data-close-modal]')) {
      $('#help-modal').hidden = true;
      return;
    }
    if (t.classList && t.classList.contains('modal') && !t.closest('.modal-box')) {
      t.hidden = true;
    }
  });

  document.addEventListener('change', function (e) {
    var cb = e.target.closest && e.target.closest('[data-check]');
    if (!cb || !current) return;
    var i = Number(cb.getAttribute('data-check'));
    var key = checkKey(current.id, i);
    if (cb.checked) state.checks[key] = true; else delete state.checks[key];
    cb.parentElement.classList.toggle('done', cb.checked);
    var done = current.checkpoint.filter(function (_, j) { return state.checks[checkKey(current.id, j)]; }).length;
    var cnt = $('.checkpoint .count');
    if (cnt) cnt.textContent = done + ' / ' + current.checkpoint.length;
    save();
    renderNav();
    if (done === current.checkpoint.length && current.checkpoint.length > 1) {
      toast('🎉 Checkpoint complet : ' + current.num + ' validé');
    }
  });

  function focusFirstTableFilter() {
    var f = $('.md .table-filter input');
    if (f) { f.focus(); f.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    else toast('Aucune table à filtrer dans cette fiche');
  }

  /* ---------------- drawer (mobile) ---------------- */
  function openDrawer() {
    $('#sidebar').classList.add('open');
    $('#scrim').hidden = false;
    $('#btn-menu').setAttribute('aria-expanded', 'true');
  }
  function closeDrawer() {
    $('#sidebar').classList.remove('open');
    $('#scrim').hidden = true;
    $('#btn-menu').setAttribute('aria-expanded', 'false');
  }

  /* ---------------- clavier ---------------- */
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
    var searching = !$('#search-modal').hidden;

    if (e.key === 'Escape') {
      if (searching) { closeSearch(); e.preventDefault(); return; }
      if (!$('#help-modal').hidden) { $('#help-modal').hidden = true; return; }
      closeDrawer();
      return;
    }

    /* la recherche garde la main même quand le champ a le focus */
    if (searching) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!search.items.length) return;
        search.sel = (search.sel + (e.key === 'ArrowDown' ? 1 : -1) + search.items.length) % search.items.length;
        $$('.res').forEach(function (a, i) { a.classList.toggle('sel', i === search.sel); });
        var sel = $$('.res')[search.sel];
        if (sel) sel.scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        openResult(search.sel);
      }
      return;
    }

    if (typing) return;

    if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
      e.preventDefault(); openSearch(); return;
    }
    if (e.key === '?') { e.preventDefault(); $('#help-modal').hidden = false; return; }
    if (e.key.toLowerCase() === 't') { setTheme(state.theme === 'dark' ? 'light' : 'dark'); return; }
    if (e.key.toLowerCase() === 'p') { e.preventDefault(); window.print(); return; }
    if (e.key.toLowerCase() === 'f') { focusFirstTableFilter(); return; }
    if (e.key.toLowerCase() === 'm' && current && !current.isHome) {
      var b = $('[data-act="toggle-read"]'); if (b) b.click(); return;
    }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && current && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var nb = neighbours(current);
      var go = e.key === 'ArrowRight' ? nb.next : nb.prev;
      if (go) location.hash = '#/' + go.id;
    }
  });

  /* ---------------- amorçage ---------------- */
  function init() {
    if (!chapters.length) {
      view.innerHTML = '<section class="hero"><h1>Contenu manquant</h1><p class="lead">Lance <code>npm run build</code> dans <code>course/web</code> pour générer <code>content.js</code>.</p></section>';
      return;
    }
    $('#btn-search').addEventListener('click', openSearch);
    $('#btn-theme').addEventListener('click', function () { setTheme(state.theme === 'dark' ? 'light' : 'dark'); });
    $('#btn-help').addEventListener('click', function () { $('#help-modal').hidden = false; });
    $('#btn-print').addEventListener('click', function (e) { e.preventDefault(); window.print(); });
    $('#btn-menu').addEventListener('click', function () {
      if ($('#sidebar').classList.contains('open')) closeDrawer(); else openDrawer();
    });
    $('#scrim').addEventListener('click', closeDrawer);
    $('#btn-reset').addEventListener('click', function () {
      if (!confirm('Effacer ta progression (fiches lues, checkpoints, quiz) ?')) return;
      state = load();
      state.theme = document.documentElement.dataset.theme;
      save(); renderNav();
      if (currentRoute === 'quiz') renderQuiz(); else render();
      toast('Progression réinitialisée');
    });

    var searchInput = $('#search-field');
    var deb;
    searchInput.addEventListener('input', function () {
      clearTimeout(deb);
      deb = setTimeout(function () { runSearch(searchInput.value); }, 110);
    });

    window.addEventListener('hashchange', render);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) closeDrawer(); });

    document.documentElement.dataset.theme = state.theme;
    if (COURSE.generatedAt) {
      $('#build-info').textContent = 'Build : ' + new Date(COURSE.generatedAt).toLocaleDateString('fr-FR');
    }
    if (!location.hash) {
      history.replaceState(null, '', '#/' + (state.last || ''));
    }
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
