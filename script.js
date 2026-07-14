/* =====================================================
   LUXURY WEDDING INVITATION — ڕەیان & کاروان
   Vanilla JS · organized as small init() modules
   ===================================================== */
(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var isMobile = window.innerWidth < 640;

  // Lock scroll until the loading screen finishes.
  document.body.classList.add('no-scroll');

  /* ---------------------------------------------------
     Eastern Arabic-Indic digit helper (کوردی ٠١٢٣٤٥٦٧٨٩)
     --------------------------------------------------- */
  var EASTERN_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  function toEasternDigits(value) {
    return String(value).replace(/[0-9]/g, function (d) { return EASTERN_DIGITS[+d]; });
  }

  /* ---------------------------------------------------
     Loading screen
     --------------------------------------------------- */
  function initLoader() {
    var loader = document.getElementById('loader');
    if (!loader) return Promise.resolve();

    var minDelay = new Promise(function (resolve) { setTimeout(resolve, 1600); });
    var pageLoad = new Promise(function (resolve) {
      if (document.readyState === 'complete') resolve();
      else window.addEventListener('load', resolve, { once: true });
    });

    return Promise.all([minDelay, pageLoad]).then(function () {
      loader.classList.add('is-hidden');
      document.body.classList.remove('no-scroll');
      setTimeout(function () { loader.remove(); }, 1100);
    });
  }

  /* ---------------------------------------------------
     Scroll-reveal via IntersectionObserver
     --------------------------------------------------- */
  function initScrollReveal() {
    var targets = document.querySelectorAll('.reveal, .countdown-grid');
    if (!('IntersectionObserver' in window) || !targets.length) {
      targets.forEach(function (el) { el.classList.add('in-view'); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ---------------------------------------------------
     Live countdown to 25 July 2026, 18:00
     --------------------------------------------------- */
  function initCountdown() {
    var target = new Date(2026, 6, 25, 18, 0, 0);
    var elDays = document.getElementById('cd-days');
    var elHours = document.getElementById('cd-hours');
    var elMins = document.getElementById('cd-mins');
    var elSecs = document.getElementById('cd-secs');
    if (!elDays) return;

    function setNum(el, value) {
      var display = toEasternDigits(String(value).padStart(2, '0'));
      if (el.textContent === display) return;
      el.textContent = display;
      el.classList.remove('tick');
      void el.offsetWidth; /* restart animation */
      el.classList.add('tick');
    }

    function tick() {
      var diff = target - new Date();

      if (diff <= 0) {
        setNum(elDays, 0); setNum(elHours, 0); setNum(elMins, 0); setNum(elSecs, 0);
        var title = document.querySelector('#countdown .section-title');
        if (title) title.textContent = 'پیرۆزە! ڕۆژی خۆشیمان هاتووە 🎉';
        clearInterval(timer);
        return;
      }

      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);

      setNum(elDays, d);
      setNum(elHours, h);
      setNum(elMins, m);
      setNum(elSecs, s);
    }

    tick();
    var timer = setInterval(tick, 1000);
  }

  /* ---------------------------------------------------
     Luxury button ripple
     --------------------------------------------------- */
  function initRippleButtons() {
    document.querySelectorAll('.btn-luxury').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        var rect = btn.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height);
        var ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', function () { ripple.remove(); });
      });
    });
  }

  /* ---------------------------------------------------
     Floating music player
     --------------------------------------------------- */
  function initMusicPlayer(loaderDone) {
    var btn = document.getElementById('musicBtn');
    var audio = document.getElementById('bgMusic');
    if (!btn || !audio) return;

    // Reflect the audio element's real state on the button, no matter
    // what triggered play/pause (autoplay, the button, or the gesture fallback).
    // This never restarts playback — play()/pause() always resume from
    // audio.currentTime, and nothing here reacts to scrolling or section changes.
    audio.addEventListener('play', function () {
      btn.classList.add('is-playing');
      btn.setAttribute('aria-pressed', 'true');
    });
    audio.addEventListener('pause', function () {
      btn.classList.remove('is-playing');
      btn.setAttribute('aria-pressed', 'false');
    });

    btn.addEventListener('click', function () {
      if (audio.paused) audio.play().catch(function () {});
      else audio.pause();
    });

    // Start playback the instant the loading screen finishes and the site
    // becomes visible. preload="auto" (see index.html) has been buffering
    // the track in the background during the loading screen so this is instant.
    loaderDone.then(function () {
      audio.play().catch(function () {
        // Autoplay blocked by the browser's security policy — arm a
        // one-time fallback that starts playback on the visitor's very
        // first tap, click, key press, or scroll, whichever comes first.
        var startOnGesture = function () {
          audio.play().catch(function () {});
        };
        ['pointerdown', 'keydown', 'touchstart', 'wheel'].forEach(function (evt) {
          window.addEventListener(evt, startOnGesture, { once: true, passive: true });
        });
      });
    });
  }

  /* ---------------------------------------------------
     Mouse parallax (hero) + scroll parallax (gallery)
     --------------------------------------------------- */
  function initParallax() {
    if (reducedMotion) return;

    var ticking = false;
    var mouseX = 0, mouseY = 0;

    document.addEventListener('mousemove', function (e) {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
      if (!ticking) {
        requestAnimationFrame(function () {
          document.documentElement.style.setProperty('--mx', mouseX + 'px');
          document.documentElement.style.setProperty('--my', mouseY + 'px');
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    var galleryCards = document.querySelectorAll('[data-parallax]');
    if (!galleryCards.length) return;
    var scrollTicking = false;

    function updateGalleryParallax() {
      var vh = window.innerHeight;
      galleryCards.forEach(function (card) {
        var rect = card.getBoundingClientRect();
        var centerOffset = (rect.top + rect.height / 2 - vh / 2) / vh;
        card.style.setProperty('--py', (centerOffset * 24) + 'px');
      });
      scrollTicking = false;
    }

    window.addEventListener('scroll', function () {
      if (!scrollTicking) {
        requestAnimationFrame(updateGalleryParallax);
        scrollTicking = true;
      }
    }, { passive: true });

    updateGalleryParallax();
  }

  /* ---------------------------------------------------
     Sparkles — soft glowing dots, twinkling in place
     --------------------------------------------------- */
  function initSparkles() {
    var field = document.getElementById('sparkleField');
    if (!field || reducedMotion) return;

    var count = isMobile ? 12 : 26;
    for (var i = 0; i < count; i++) {
      var sparkle = document.createElement('span');
      sparkle.className = 'sparkle';
      sparkle.style.left = (Math.random() * 100) + 'vw';
      sparkle.style.top = (Math.random() * 100) + 'vh';
      sparkle.style.animationDelay = (Math.random() * 3) + 's';
      sparkle.style.animationDuration = (2 + Math.random() * 2.5) + 's';
      var size = 2 + Math.random() * 3;
      sparkle.style.width = size + 'px';
      sparkle.style.height = size + 'px';
      field.appendChild(sparkle);
    }
  }

  /* ---------------------------------------------------
     Falling petals — rose & sakura, wind-swayed
     --------------------------------------------------- */
  function initPetals() {
    var field = document.getElementById('petalField');
    if (!field || reducedMotion) return;

    var maxPetals = isMobile ? 8 : 16;
    var active = 0;

    function spawnPetal() {
      if (active >= maxPetals) return;
      active++;

      var petal = document.createElement('span');
      var kind = Math.random() < 0.5 ? 'rose' : 'sakura';
      petal.className = 'petal ' + kind;

      var size = 8 + Math.random() * 10;
      var duration = 8 + Math.random() * 7;
      var sway = 30 + Math.random() * 60;

      petal.style.width = size + 'px';
      petal.style.height = size + 'px';
      petal.style.left = (Math.random() * 100) + 'vw';
      petal.style.setProperty('--dur', duration + 's');
      petal.style.setProperty('--delay', '0s');
      petal.style.setProperty('--sway', sway);
      petal.style.transform = 'rotate(' + Math.floor(Math.random() * 360) + 'deg)';

      field.appendChild(petal);

      setTimeout(function () {
        petal.remove();
        active--;
      }, duration * 1000 + 200);
    }

    var spawnRate = isMobile ? 1100 : 700;
    for (var i = 0; i < 4; i++) setTimeout(spawnPetal, i * 300);
    setInterval(spawnPetal, spawnRate);
  }

  /* ---------------------------------------------------
     Premium CSS/JS butterflies — realistic wandering flight
     --------------------------------------------------- */
  function initButterflies() {
    var field = document.getElementById('butterflyField');
    if (!field || reducedMotion) return;

    var colors = ['c-cream', 'c-white', 'c-gold', 'c-lavender'];
    var count = isMobile ? 5 : 10;
    var butterflies = [];

    for (var i = 0; i < count; i++) {
      var el = document.createElement('div');
      var size = 16 + Math.random() * 18;
      var color = colors[Math.floor(Math.random() * colors.length)];
      var layer = Math.random() < 0.4 ? 'behind' : 'front';

      el.className = 'butterfly ' + color + ' ' + layer;
      el.style.width = size + 'px';
      el.style.height = (size * 0.82) + 'px';
      el.innerHTML = '<span class="wing left"></span><span class="wing right"></span><span class="body"></span>';
      field.appendChild(el);

      butterflies.push({
        el: el,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        angle: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.55,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.03 + Math.random() * 0.03
      });
    }

    function frame() {
      var w = window.innerWidth, h = window.innerHeight;

      butterflies.forEach(function (b) {
        b.angle += (Math.random() - 0.5) * 0.12;
        b.wobble += b.wobbleSpeed;

        var vx = Math.cos(b.angle) * b.speed;
        var vy = Math.sin(b.angle) * b.speed + Math.sin(b.wobble) * 0.4;

        b.x += vx;
        b.y += vy;

        if (b.x < -40) b.x = w + 40;
        if (b.x > w + 40) b.x = -40;
        if (b.y < -40) b.y = h + 40;
        if (b.y > h + 40) b.y = -40;

        var tilt = Math.sin(b.wobble) * 14;
        var flip = vx < 0 ? -1 : 1;
        b.el.style.transform =
          'translate3d(' + b.x + 'px,' + b.y + 'px,0) scaleX(' + flip + ') rotate(' + tilt + 'deg)';
      });

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  /* ---------------------------------------------------
     Boot
     --------------------------------------------------- */
  function boot() {
    var loaderDone = initLoader();
    initScrollReveal();
    initCountdown();
    initRippleButtons();
    initMusicPlayer(loaderDone);
    initParallax();
    initSparkles();
    initPetals();
    initButterflies();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
