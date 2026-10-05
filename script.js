// Fades/slides in any .reveal element the first time it scrolls into view.
// Runs on every page (nav, cards, headings, portfolio items, etc).
(function () {
  var items = document.querySelectorAll('.reveal');
  if (!items.length || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  items.forEach(function (el) { io.observe(el); });
})();

// Nav bar tightens up once the page has scrolled a bit.
(function () {
  var nav = document.querySelector('nav');
  if (!nav) return;
  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
})();

// Subtle parallax drift on the mock panels: once a panel has revealed,
// it drifts a few pixels against the scroll for a bit of continuous motion.
(function () {
  var mocks = document.querySelectorAll('.mock');
  if (!mocks.length) return;
  function onScroll() {
    mocks.forEach(function (el) {
      if (!el.classList.contains('is-visible')) return;
      var rect = el.getBoundingClientRect();
      var centerDelta = (window.innerHeight / 2) - (rect.top + rect.height / 2);
      el.style.transform = 'translateY(' + (-centerDelta * 0.06) + 'px)';
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();

// Draws a line down through the .services section that fills gold as you scroll,
// and lights up each .dot marker once you've scrolled past it.
(function () {
  var section = document.getElementById('services');
  if (!section) return; // page has no line (e.g. portfolio.html)

  var svg = document.getElementById('line');
  var bgPath = document.getElementById('linepath-bg');
  var goldPath = document.getElementById('linepath-gold');
  var dots = document.querySelectorAll('[data-dot]');

  // dot.offsetTop only measures against the nearest positioned ancestor,
  // which for each dot is its own .service block, not the whole track.
  // Use bounding-rect math instead to get a true position within .services.
  function topWithinSection(el) {
    return el.getBoundingClientRect().top - section.getBoundingClientRect().top;
  }

  function buildPath() {
    var h = section.offsetHeight;
    svg.setAttribute('height', h);
    svg.setAttribute('width', 4);

    var x = 2;
    var points = [];
    dots.forEach(function (d) { points.push(topWithinSection(d)); });

    var d = 'M ' + x + ' 0 ';
    var prevY = 0;
    points.forEach(function (y) {
      var midY = (prevY + y) / 2;
      d += 'C ' + x + ' ' + midY + ', ' + x + ' ' + midY + ', ' + x + ' ' + y + ' ';
      prevY = y;
    });
    d += 'L ' + x + ' ' + h;

    bgPath.setAttribute('d', d);
    goldPath.setAttribute('d', d);

    try {
      var len = goldPath.getTotalLength();
      goldPath.style.strokeDasharray = len;
      goldPath.dataset.len = len;
      updateProgress();
    } catch (e) { /* ignore */ }
  }

  function updateProgress() {
    var len = parseFloat(goldPath.dataset.len || 0);
    if (!len) return;

    var rect = section.getBoundingClientRect();
    var vh = window.innerHeight;
    var total = rect.height;

    // progress reaches 1 once the bottom trigger line (60% down the viewport)
    // has travelled the full height of the services section
    var progress = (vh * 0.6 - rect.top) / total;
    progress = Math.max(0, Math.min(1, progress));

    goldPath.style.strokeDashoffset = len * (1 - progress);

    var passed = progress * total;
    dots.forEach(function (dot) {
      if (topWithinSection(dot) <= passed + 10) dot.classList.add('active');
      else dot.classList.remove('active');
    });
  }

  window.addEventListener('resize', buildPath);
  window.addEventListener('load', buildPath);
  window.addEventListener('scroll', updateProgress, { passive: true });
  // fonts/images loading can change section height after first paint
  setTimeout(buildPath, 50);
  setTimeout(buildPath, 400);
})();

// Counts numbers up from 0 the first time they scroll into view.
(function () {
  var nums = document.querySelectorAll('[data-count]');
  if (!nums.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function fmt(el, v) {
    var d = parseInt(el.dataset.decimals || 0, 10);
    el.textContent = v.toFixed(d) + (el.dataset.suffix || '');
  }
  function run(el) {
    var target = parseFloat(el.dataset.count);
    if (reduce) { fmt(el, target); return; }
    var start = null, dur = 1400;
    function step(t) {
      if (start === null) start = t;
      var p = Math.min(1, (t - start) / dur);
      fmt(el, target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  if (!('IntersectionObserver' in window)) { nums.forEach(function (n) { fmt(n, parseFloat(n.dataset.count)); }); return; }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
    });
  }, { threshold: 0.4 });
  nums.forEach(function (n) { io.observe(n); });
})();

// Contact form -> opens a pre-filled WhatsApp chat (no backend needed)
(function () {
  var form = document.getElementById('contact-form');
  if (!form) return;
  var note = document.getElementById('cf-note');
  var businessSelect = document.getElementById('cf-business');
  var businessOther = document.getElementById('cf-business-other');
  var WA_NUMBER = '254706829577';

  businessSelect.addEventListener('change', function () {
    var isOther = businessSelect.value === 'Other';
    businessOther.hidden = !isOther;
    businessOther.required = isOther;
    if (isOther) businessOther.focus();
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements['name'].value.trim();
    var businessChoice = businessSelect.value;
    var business = businessChoice === 'Other'
      ? businessOther.value.trim()
      : businessChoice;
    var service = form.elements['service'].value;

    if (!name || !business || !service) {
      note.textContent = 'Please fill in your name, business type and service.';
      note.classList.remove('ok');
      return;
    }

    var message = 'Hi Arcane, my name is ' + name + '. I run a ' + business +
      ' business and I\'m interested in ' + service + '.';
    var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(message);

    note.textContent = 'Opening WhatsApp…';
    note.classList.add('ok');
    window.open(url, '_blank', 'noopener');
    form.reset();
  });
})();

// Hero 3D scene: tilts with pointer (desktop) or phone motion (mobile),
// sways gently when idle, drifts on scroll, and spawns light CSS embers.
(function () {
  var scene = document.getElementById('scene');
  if (!scene) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  // embers: a couple dozen tiny gold specks rising at different depths
  function spawn(host, count) {
    for (var i = 0; i < count; i++) {
      var e = document.createElement('i');
      var size = 3 + Math.random() * 5;
      e.style.left = (12 + Math.random() * 76) + '%';
      e.style.width = e.style.height = size + 'px';
      e.style.setProperty('--dx', (Math.random() * 90 - 45) + 'px');
      e.style.animationDuration = (5 + Math.random() * 6) + 's';
      e.style.animationDelay = (-Math.random() * 10) + 's';
      host.appendChild(e);
    }
  }
  var small = window.innerWidth < 720;
  spawn(scene.querySelector('.embers-back'), small ? 6 : 10);
  spawn(scene.querySelector('.embers-front'), small ? 4 : 6);

  var hero = document.querySelector('header.hero');
  var tx = 0, ty = 0, cx = 0, cy = 0;       // target / current tilt (deg)
  var lastInput = 0, visible = true, running = false, sy = 0;

  function setTarget(nx, ny) { // nx, ny in -1..1
    ty = nx * 12; tx = -ny * 8; lastInput = performance.now();
  }
  if (window.matchMedia && window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('pointermove', function (e) {
      setTarget((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }, { passive: true });
  }
  window.addEventListener('deviceorientation', function (e) {
    if (e.gamma == null || e.beta == null) return;
    setTarget(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 50) / 30)));
  }, { passive: true });

  window.addEventListener('scroll', function () {
    sy = Math.min(window.scrollY, 700) * 0.12; // drifts slower than the page
  }, { passive: true });

  function frame(t) {
    if (!running) return;
    if (t - lastInput > 2500) { // idle: slow sway
      ty = Math.sin(t / 2600) * 7;
      tx = Math.cos(t / 3400) * 3.5;
    }
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    scene.style.setProperty('--rx', cx.toFixed(2) + 'deg');
    scene.style.setProperty('--ry', cy.toFixed(2) + 'deg');
    scene.style.setProperty('--sy', sy.toFixed(1) + 'px');
    requestAnimationFrame(frame);
  }
  function start() { if (!running && visible && !document.hidden) { running = true; requestAnimationFrame(frame); } }
  function stop() { running = false; }

  if ('IntersectionObserver' in window && hero) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting; visible ? start() : stop();
    }).observe(hero);
  }
  document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
  start();
})();

// Page-wide atmosphere: gradient orbs + sheen + embers + sparkles on a fixed 3D layer.
// Fades in as you scroll past the hero (so the hero stays as-is), orbs travel with scroll
// progress, and the whole layer tilts with the pointer / phone motion.
(function () {
  var amb = document.getElementById('ambient');
  if (!amb) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.querySelector('header.hero');
  var small = window.innerWidth < 720;

  function spawn(host, count, sparkle) {
    if (!host) return;
    for (var i = 0; i < count; i++) {
      var e = document.createElement('i');
      e.style.left = (Math.random() * 100) + '%';
      if (sparkle) {
        e.style.top = (Math.random() * 100) + '%';
        e.style.animationDuration = (2.5 + Math.random() * 3.5) + 's';
      } else {
        var s = 3 + Math.random() * 6;
        e.style.width = e.style.height = s + 'px';
        e.style.setProperty('--dx', (Math.random() * 120 - 60) + 'px');
        e.style.animationDuration = (9 + Math.random() * 9) + 's';
      }
      e.style.animationDelay = (-Math.random() * 12) + 's';
      host.appendChild(e);
    }
  }
  if (!reduce) {
    spawn(amb.querySelector('.amb-embers.back'), small ? 7 : 14);
    spawn(amb.querySelector('.amb-embers.front'), small ? 3 : 6);
    spawn(amb.querySelector('.amb-sparkles'), small ? 10 : 24, true);
  }

  var p = 0, pt = 0, ao = 0, aot = hero ? 0 : 1, rx = 0, ry = 0, trx = 0, tryy = 0, raf = 0;

  function readScroll() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    pt = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    if (hero) {
      var h = hero.offsetHeight || window.innerHeight;
      aot = Math.min(1, Math.max(0, (window.scrollY - h * 0.15) / (h * 0.55)));
    }
    kick();
  }
  function tick() {
    raf = 0;
    p += (pt - p) * 0.08; ao += (aot - ao) * 0.12;
    rx += (trx - rx) * 0.05; ry += (tryy - ry) * 0.05;
    var a = p * Math.PI * 2, b = p * Math.PI * 5, st = amb.style;
    st.setProperty('--s1', Math.sin(a).toFixed(3)); st.setProperty('--c1', Math.cos(a).toFixed(3));
    st.setProperty('--s2', Math.sin(b).toFixed(3)); st.setProperty('--c2', Math.cos(b).toFixed(3));
    st.setProperty('--arx', rx.toFixed(2) + 'deg'); st.setProperty('--ary', ry.toFixed(2) + 'deg');
    st.setProperty('--ao', ao.toFixed(3));
    if (Math.abs(pt - p) > 0.0005 || Math.abs(aot - ao) > 0.003 ||
        Math.abs(trx - rx) > 0.02 || Math.abs(tryy - ry) > 0.02) kick();
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  function tilt(nx, ny) { tryy = nx * 4; trx = -ny * 3; kick(); }

  if (!reduce) {
    if (window.matchMedia && window.matchMedia('(pointer:fine)').matches) {
      window.addEventListener('pointermove', function (e) {
        tilt((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
      }, { passive: true });
    }
    window.addEventListener('deviceorientation', function (e) {
      if (e.gamma == null || e.beta == null) return;
      tilt(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 50) / 30)));
    }, { passive: true });
  }
  window.addEventListener('scroll', readScroll, { passive: true });
  window.addEventListener('resize', readScroll);
  window.addEventListener('load', readScroll);
  readScroll();
})();
