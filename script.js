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
     Always start at the top of the page — never resume
     a mid-page scroll position on load/refresh/bfcache.
     --------------------------------------------------- */
  function forceScrollTop() {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }
  if ('scrollRestoration' in history) { history.scrollRestoration = 'manual'; }
  forceScrollTop();
  window.addEventListener('load', forceScrollTop);
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) forceScrollTop();
  });

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
     (the hero's own .hero-reveal elements are excluded —
     they fade in once the cinematic opening finishes,
     see initCinematicIntro/revealHero below)
     --------------------------------------------------- */
  function initScrollReveal() {
    var targets = document.querySelectorAll('.reveal:not(.hero-reveal), .countdown-grid');
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

  function revealHero() {
    document.querySelectorAll('.hero-reveal').forEach(function (el) {
      el.classList.add('in-view');
    });
  }

  /* ---------------------------------------------------
     Cinematic opening — poster on load, plays once on
     the visitor's first tap/click, then fades away to
     reveal the hero.

     The intro video's own audio track must never be heard:
     it stays muted for its entire life. The first tap/click
     starts the background music (#bgMusic) instead, and that
     same audio element keeps playing uninterrupted straight
     through into the site once the intro finishes.
     --------------------------------------------------- */
  function initCinematicIntro() {
    var intro = document.getElementById('cinematicIntro');
    var video = document.getElementById('introVideo');
    var music = document.getElementById('bgMusic');

    if (video) {
      var forceMuted = function () {
        video.muted = true;
        video.volume = 0;
      };
      forceMuted();
      video.addEventListener('volumechange', forceMuted);
    }

    if (!intro || !video) return Promise.resolve();

    document.documentElement.classList.add('intro-active');

    var showFirstFrame = function () {
      try { video.currentTime = 0; } catch (e) {}
    };
    if (video.readyState >= 1) showFirstFrame();
    else video.addEventListener('loadedmetadata', showFirstFrame, { once: true });

    return new Promise(function (resolve) {
      var started = false;
      var finished = false;

      function beginPlayback() {
        if (started) return;
        started = true;
        intro.classList.add('is-playing');
        video.muted = true;
        video.play().catch(function () {});
        if (music) music.play().catch(function () {});

        /* Only crossfade the poster away once the browser has
           actually started rendering video frames (the 'playing'
           event) — never on tap alone — so there is no window
           where a not-yet-painted <video> could show through as
           black. A short safety timeout covers the rare browser
           that never fires 'playing' after play(). */
        var revealVideo = function () { intro.classList.add('video-ready'); };
        video.addEventListener('playing', revealVideo, { once: true });
        setTimeout(revealVideo, 2500);
      }

      ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(function (evt) {
        window.addEventListener(evt, beginPlayback, { once: true, passive: true });
      });

      function finish() {
        if (finished) return;
        finished = true;
        intro.classList.add('is-hidden');
        document.documentElement.classList.remove('intro-active');

        var cleanup = function () {
          if (intro.parentNode) intro.parentNode.removeChild(intro);
          resolve();
        };
        intro.addEventListener('transitionend', cleanup, { once: true });
        setTimeout(cleanup, 1800); /* safety net if transitionend never fires */
      }

      video.addEventListener('ended', finish, { once: true });
      video.addEventListener('error', function () {
        beginPlayback();
        finish();
      }, { once: true });
    });
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

    // Changed elements from the current tick, restarted together below —
    // batches what would otherwise be one forced synchronous layout
    // (the offsetWidth read needed to restart the tick animation) per
    // digit into a single shared layout flush for the whole tick.
    var changed = [];

    function setNum(el, value) {
      var display = toEasternDigits(String(value).padStart(2, '0'));
      if (el.textContent === display) return;
      el.textContent = display;
      el.classList.remove('tick');
      changed.push(el);
    }

    function tick() {
      var diff = target - new Date();
      changed.length = 0;

      if (diff <= 0) {
        setNum(elDays, 0); setNum(elHours, 0); setNum(elMins, 0); setNum(elSecs, 0);
        var title = document.querySelector('#countdown .section-title');
        if (title) title.textContent = 'پیرۆزە! ڕۆژی خۆشیمان هاتووە 🎉';
        clearInterval(timer);
      } else {
        var d = Math.floor(diff / 86400000);
        var h = Math.floor((diff % 86400000) / 3600000);
        var m = Math.floor((diff % 3600000) / 60000);
        var s = Math.floor((diff % 60000) / 1000);

        setNum(elDays, d);
        setNum(elHours, h);
        setNum(elMins, m);
        setNum(elSecs, s);
      }

      if (changed.length) {
        void changed[0].offsetWidth; /* one shared reflow restarts every changed digit's animation */
        for (var i = 0; i < changed.length; i++) changed[i].classList.add('tick');
      }
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

    // The cinematic intro (see initCinematicIntro) starts this same
    // <audio> element directly on the visitor's first tap/click, and it
    // keeps playing uninterrupted through and beyond the intro — so it
    // needs no autoplay attempt here. This fallback only matters if the
    // intro markup isn't present at all.
    if (!document.getElementById('cinematicIntro')) {
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
  }

  /* ---------------------------------------------------
     Mouse parallax (hero)
     - only listens/computes while .hero-inner is actually
       on screen (IntersectionObserver), so nothing runs once
       the visitor has scrolled past the hero
     - writes transform directly on the target element instead
       of through root-level CSS custom properties, so the
       browser only has to restyle the one element that
       actually changes instead of re-evaluating --mx/--my
       everywhere they're referenced from the document root
     --------------------------------------------------- */
  function initParallax() {
    if (reducedMotion) return;
    var target = document.querySelector('.hero-inner');
    if (!target) return;

    var ticking = false;
    var active = false;
    var mouseX = 0, mouseY = 0;

    function onMouseMove(e) {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 20;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 20;
      if (!ticking) {
        requestAnimationFrame(function () {
          target.style.transform = 'translate3d(' + (-mouseX) + 'px,' + (-mouseY) + 'px,0)';
          ticking = false;
        });
        ticking = true;
      }
    }

    if (!('IntersectionObserver' in window)) {
      document.addEventListener('mousemove', onMouseMove, { passive: true });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && !active) {
        active = true;
        document.addEventListener('mousemove', onMouseMove, { passive: true });
      } else if (!visible && active) {
        active = false;
        document.removeEventListener('mousemove', onMouseMove);
      }
    });
    observer.observe(document.getElementById('hero') || target);
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
     - a fixed pool of maxPetals elements, created once and
       reused for every fall instead of creating/destroying a
       DOM node per petal forever, to avoid continuous
       allocation and GC pressure over a long session
     --------------------------------------------------- */
  function initPetals() {
    var field = document.getElementById('petalField');
    if (!field || reducedMotion) return;

    var maxPetals = isMobile ? 8 : 16;
    var pool = [];

    for (var p = 0; p < maxPetals; p++) {
      var el = document.createElement('span');
      el.className = 'petal';
      el.style.opacity = '0';
      el.style.animation = 'none';
      field.appendChild(el);
      var entry = { el: el, active: false };
      el.addEventListener('animationend', function (entry) {
        return function () {
          entry.active = false;
          entry.el.style.animation = 'none';
        };
      }(entry));
      pool.push(entry);
    }

    function spawnPetal() {
      var entry = null;
      for (var i = 0; i < pool.length; i++) {
        if (!pool[i].active) { entry = pool[i]; break; }
      }
      if (!entry) return;
      entry.active = true;

      var petal = entry.el;
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

      /* Changing --dur/--sway alone wouldn't restart an animation
         that's already finished — force it to restart from 0%. */
      petal.style.animation = 'none';
      void petal.offsetWidth;
      petal.style.animation = '';
    }

    var spawnRate = isMobile ? 1100 : 700;
    for (var i = 0; i < 4; i++) setTimeout(spawnPetal, i * 300);
    setInterval(spawnPetal, spawnRate);
  }

  /* ---------------------------------------------------
     Premium SVG butterflies — realistic wandering flight
     - delicate hand-drawn wing silhouettes with soft
       translucent gradients (no cartoonish div shapes)
     - both wings flap in sync, as real butterflies do
     - curved, ever-changing paths (no straight lines)
     - eased acceleration toward a randomly re-picked speed
     - occasional brief pause before a new direction
     - a gentle sinusoidal bob layered on top of the flight
       path so movement never looks mechanical
     - some fly behind cards, some in front
     --------------------------------------------------- */
  var BFLY_THEMES = [
    { c1: '#fefcf8', c2: '#ecdfc9' },  /* soft white   */
    { c1: '#fff3da', c2: '#e3c48f' },  /* cream        */
    { c1: '#f7e7ce', c2: '#d9b98a' },  /* champagne    */
    { c1: '#f6d9dc', c2: '#dba3ac' },  /* blush pink   */
    { c1: '#ece3f7', c2: '#c3aee0' }   /* light lavender */
  ];

  /* One shared gradient per theme (5 total) instead of one brand-new
     <radialGradient> per butterfly instance (up to 10) — url(#id) paint
     references resolve document-wide, not just within the local <svg>,
     so every butterfly can point at the same 5 defs. Halves the number
     of gradient/stop nodes the renderer has to track for an identical
     visual result. */
  function injectSharedButterflyGradients() {
    var svgNS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.position = 'absolute';
    svg.style.overflow = 'hidden';
    var defs = document.createElementNS(svgNS, 'defs');
    BFLY_THEMES.forEach(function (theme, i) {
      var grad = document.createElementNS(svgNS, 'radialGradient');
      grad.setAttribute('id', 'bflyGradShared' + i);
      grad.setAttribute('cx', '34%');
      grad.setAttribute('cy', '28%');
      grad.setAttribute('r', '82%');
      [['0%', '#ffffff', '.95'], ['55%', theme.c1, '.6'], ['100%', theme.c2, '.28']].forEach(function (s) {
        var stop = document.createElementNS(svgNS, 'stop');
        stop.setAttribute('offset', s[0]);
        stop.setAttribute('stop-color', s[1]);
        stop.setAttribute('stop-opacity', s[2]);
        grad.appendChild(stop);
      });
      defs.appendChild(grad);
    });
    svg.appendChild(defs);
    document.body.appendChild(svg);
  }

  function buildButterflySVG(themeIndex) {
    var gradRef = 'url(#bflyGradShared' + themeIndex + ')';
    var foreR = 'M0,-3 C6,-14 16,-22 30,-25 C31,-16 27,-6 18,1 C11,6 3,3 0,-3 Z';
    var foreL = 'M0,-3 C-6,-14 -16,-22 -30,-25 C-31,-16 -27,-6 -18,1 C-11,6 -3,3 0,-3 Z';
    var hindR = 'M0,1 C6,4 16,8 22,18 C25,23 24,27 20,26 C14,25 7,19 1,11 C-1,7 -1,3 0,1 Z';
    var hindL = 'M0,1 C-6,4 -16,8 -22,18 C-25,23 -24,27 -20,26 C-14,25 -7,19 -1,11 C1,7 1,3 0,1 Z';
    return (
      '<svg class="bfly-svg" viewBox="-34 -30 68 60" xmlns="http://www.w3.org/2000/svg">' +
        '<g class="bfly-side bfly-right">' +
          '<path class="bfly-wing bfly-fore" fill="' + gradRef + '" d="' + foreR + '"/>' +
          '<path class="bfly-wing bfly-hind" fill="' + gradRef + '" d="' + hindR + '"/>' +
        '</g>' +
        '<g class="bfly-side bfly-left">' +
          '<path class="bfly-wing bfly-fore" fill="' + gradRef + '" d="' + foreL + '"/>' +
          '<path class="bfly-wing bfly-hind" fill="' + gradRef + '" d="' + hindL + '"/>' +
        '</g>' +
        '<path class="bfly-body" d="M0,-14 C1.6,-14 2.1,-9 1.4,0 C2.1,8 1.6,14 0,16 C-1.6,14 -2.1,8 -1.4,0 C-2.1,-9 -1.6,-14 0,-14 Z"/>' +
        '<path class="bfly-antenna" d="M-0.6,-13 C-3,-18 -6.5,-19.5 -8.5,-17.5 M0.6,-13 C3,-18 6.5,-19.5 8.5,-17.5"/>' +
      '</svg>'
    );
  }

  function initButterflies() {
    var fieldBehind = document.getElementById('butterflyField');
    var fieldFront = document.getElementById('butterflyFieldFront');
    if (!fieldBehind || !fieldFront || reducedMotion) return;

    injectSharedButterflyGradients();

    var count = isMobile ? 5 : 10;
    var butterflies = [];

    for (var i = 0; i < count; i++) {
      var container = Math.random() < 0.4 ? fieldBehind : fieldFront;

      var el = document.createElement('div');
      var size = 18 + Math.random() * 20;
      var themeIndex = Math.floor(Math.random() * BFLY_THEMES.length);
      var flapDur = (0.34 + Math.random() * 0.28).toFixed(2);
      var flapPhase = (Math.random() * -0.4).toFixed(2);

      el.className = 'butterfly';
      el.style.width = size + 'px';
      el.style.height = (size * 0.9) + 'px';
      el.innerHTML = buildButterflySVG(themeIndex);

      var sides = el.querySelectorAll('.bfly-side');
      for (var s = 0; s < sides.length; s++) {
        sides[s].style.animationDuration = flapDur + 's';
        sides[s].style.animationDelay = flapPhase + 's';
      }

      container.appendChild(el);

      butterflies.push({
        el: el,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        angle: Math.random() * Math.PI * 2,
        targetAngle: Math.random() * Math.PI * 2,
        speed: 0,
        maxSpeed: 0.3 + Math.random() * 0.5,
        state: 'flying',
        stateTimer: 90 + Math.random() * 180,
        bobPhase: Math.random() * Math.PI * 2,
        bobSpeed: 0.03 + Math.random() * 0.04,
        bobAmp: 2.5 + Math.random() * 3.5
      });
    }

    function pickNewCourse(b) {
      b.targetAngle = b.angle + (Math.random() - 0.5) * Math.PI * 1.3;
      b.maxSpeed = 0.25 + Math.random() * 0.55;
    }

    function frame() {
      var w = window.innerWidth, h = window.innerHeight;

      butterflies.forEach(function (b) {
        b.stateTimer--;

        if (b.stateTimer <= 0) {
          if (b.state === 'flying' && Math.random() < 0.25) {
            b.state = 'pausing';
            b.stateTimer = 18 + Math.random() * 35;
          } else {
            b.state = 'flying';
            pickNewCourse(b);
            b.stateTimer = 100 + Math.random() * 200;
          }
        }

        var targetSpeed = b.state === 'pausing' ? 0 : b.maxSpeed;
        b.speed += (targetSpeed - b.speed) * 0.03;

        var da = Math.atan2(Math.sin(b.targetAngle - b.angle), Math.cos(b.targetAngle - b.angle));
        b.angle += da * 0.02 + (Math.random() - 0.5) * 0.02;

        var sinAngle = Math.sin(b.angle);
        var vx = Math.cos(b.angle) * b.speed;
        var vy = sinAngle * b.speed;

        b.x += vx;
        b.y += vy;
        b.bobPhase += b.bobSpeed;

        if (b.x < -40) b.x = w + 40;
        if (b.x > w + 40) b.x = -40;
        if (b.y < -40) b.y = h + 40;
        if (b.y > h + 40) b.y = -40;

        var speedRatio = 0.3 + b.speed / (b.maxSpeed || 1);
        var bob = Math.sin(b.bobPhase) * b.bobAmp * speedRatio;
        var tilt = sinAngle * 8 * (b.speed / (b.maxSpeed || 1));
        var flip = vx < -0.02 ? -1 : 1;
        b.el.style.transform =
          'translate3d(' + b.x.toFixed(1) + 'px,' + (b.y + bob).toFixed(1) + 'px,0) scaleX(' + flip + ') rotate(' + tilt.toFixed(1) + 'deg)';
      });

      rafHandle = requestAnimationFrame(frame);
    }

    var rafHandle = null;
    function start() {
      if (rafHandle === null) rafHandle = requestAnimationFrame(frame);
    }
    function stop() {
      if (rafHandle !== null) {
        cancelAnimationFrame(rafHandle);
        rafHandle = null;
      }
    }
    // Most browsers already throttle rAF in hidden tabs, but pausing
    // explicitly avoids a burst of catch-up work if one doesn't, and
    // frees the main thread of this loop's script time entirely while
    // the tab isn't visible (positions simply resume where they left off).
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    start();
  }

  /* ---------------------------------------------------
     Defer non-critical work off the main thread's busy
     window. Used only for the ambient decorations (sparkles/
     petals/butterflies): they're fully covered by the opaque
     cinematic-intro overlay (z-index 3000) until the visitor's
     first tap, so starting them a tick later than the critical
     boot path (loader, countdown, cinematic intro wiring) is
     completely invisible while keeping the main thread free
     during the most contended startup window.
     --------------------------------------------------- */
  function whenIdle(fn) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(fn, { timeout: 2000 });
    } else {
      setTimeout(fn, 200);
    }
  }

  /* ---------------------------------------------------
     Warm the HTTP cache for the intro video once the page has
     settled, so that by the time the visitor actually taps (a
     physical action that takes real time — noticing the hint,
     moving a finger/cursor, tapping), the browser already has
     some or all of the file cached and can start playback
     instantly instead of cold-starting the fetch at that exact
     moment. The <video> keeps preload="metadata" in the markup
     (unchanged) so the initial page load is never gated behind
     it — this only adds a low-priority, deferred prefetch on
     top, well after load, using the same idle-time pattern as
     the sparkles/petals/butterflies deferral above.
     --------------------------------------------------- */
  function prefetchIntroVideo() {
    var video = document.getElementById('introVideo');
    if (!video) return;
    var src = video.currentSrc || video.src;
    if (!src) return;

    var link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = src;
    link.setAttribute('fetchpriority', 'low');
    document.head.appendChild(link);
  }

  /* ---------------------------------------------------
     Boot
     --------------------------------------------------- */
  function boot() {
    var loaderDone = initLoader();
    var introDone = initCinematicIntro();
    initScrollReveal();
    initCountdown();
    initRippleButtons();
    introDone.then(revealHero);
    initMusicPlayer(loaderDone);
    initParallax();
    whenIdle(initSparkles);
    whenIdle(initPetals);
    whenIdle(initButterflies);
    whenIdle(prefetchIntroVideo);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
