/* =========================================================
   ROOFTIQ — interactions & animation
   (The preloader and hero have their own inline scripts in index.html.)
   ========================================================= */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Toast ---------- */
  const toast = $('#toast');
  let toastTimer;
  function showToast(msg, type = '') {
    toast.textContent = msg;
    toast.className = 'toast is-visible' + (type ? ' is-' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 3600);
  }

  /* ---------- Scroll progress + back to top ---------- */
  const scrollBar = $('#scrollBar');
  const backTop = $('#backTop');
  let ticking = false;
  function onScroll() {
    const y = window.scrollY;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    scrollBar.style.width = (h > 0 ? (y / h) * 100 : 0) + '%';
    backTop.classList.toggle('is-visible', y > 600);
    ticking = false;
  }
  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
  }, { passive: true });
  backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }));

  /* ---------- Scroll reveal (IntersectionObserver) ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-visible'); revealIO.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach(el => revealIO.observe(el));

  /* ---------- Counters ---------- */
  function animateCounter(el) {
    const target = parseFloat(el.dataset.target);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const fmt = n => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    if (reduceMotion) { el.textContent = fmt(target); return; }
    const duration = 1800;
    const start = performance.now();
    (function tick(now) {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    })(start);
  }
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { animateCounter(e.target); counterIO.unobserve(e.target); } });
  }, { threshold: 0.6 });
  $$('.counter').forEach(el => counterIO.observe(el));

  /* ---------- Process line progress ---------- */
  const steps = $('.steps');
  if (steps) {
    const stepIO = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { steps.style.setProperty('--progress', '100%'); stepIO.disconnect(); } });
    }, { threshold: 0.4 });
    stepIO.observe(steps);
  }

  /* ---------- 3D tilt on service cards ---------- */
  if (!reduceMotion && window.matchMedia('(hover: hover)').matches) {
    $$('.tilt').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateX(${(-y * 6).toFixed(2)}deg) rotateY(${(x * 6).toFixed(2)}deg) translateY(-6px)`;
      });
      card.addEventListener('mouseenter', () => { card.style.transition = 'transform .1s linear, box-shadow .35s var(--ease)'; });
      card.addEventListener('mouseleave', () => { card.style.transform = ''; card.style.transition = 'transform .5s var(--ease), box-shadow .35s var(--ease)'; });
    });
  }

  /* ---------- Before / After compare ---------- */
  const box = $('#compareBox');
  if (box) {
    const before = $('#compareBefore');
    const handle = $('#compareHandle');
    let dragging = false;
    function setPos(clientX) {
      const r = box.getBoundingClientRect();
      const pct = Math.max(2, Math.min(98, ((clientX - r.left) / r.width) * 100));
      before.style.width = pct + '%';
      before.style.setProperty('--w', (100 / pct).toFixed(4));
      handle.style.left = pct + '%';
      handle.setAttribute('aria-valuenow', Math.round(pct));
    }
    before.style.setProperty('--w', '2');
    box.addEventListener('pointerdown', (e) => { dragging = true; box.setPointerCapture(e.pointerId); setPos(e.clientX); });
    box.addEventListener('pointermove', (e) => { if (dragging) setPos(e.clientX); });
    box.addEventListener('pointerup', () => dragging = false);
    box.addEventListener('pointercancel', () => dragging = false);
    handle.addEventListener('keydown', (e) => {
      const cur = parseFloat(handle.style.left) || 50;
      const r = box.getBoundingClientRect();
      if (e.key === 'ArrowLeft') { e.preventDefault(); setPos(r.left + r.width * (cur - 3) / 100); }
      if (e.key === 'ArrowRight') { e.preventDefault(); setPos(r.left + r.width * (cur + 3) / 100); }
    });
  }

  /* ---------- Range slider fill ---------- */
  function paintRange(input) {
    const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--fill', pct + '%');
  }
  $$('input[type="range"]').forEach(r => { paintRange(r); r.addEventListener('input', () => paintRange(r)); });

  function bump(el) { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); }

  /* ---------- Scroll-scrub flythrough ----------
     Turns the scroll bar into the video's playhead.

     progress()  how far through the tall runway we are, clamped 0..1.
                 -rect.top is how far its top has passed the viewport top;
                 dividing by (height - one screen) makes that a fraction,
                 because the last screenful is the sticky stage sitting still.

     render()    eases 'shown' toward 'target' instead of jumping to it.
                 Seeking a video is expensive, and raw scroll values are
                 spiky, so a 12% step per frame smooths the motion and cuts
                 the number of seeks. Below a hair's width of difference we
                 stop the loop entirely rather than burn frames forever.

     Everything visual reads from the --p custom property, so the rail and
     the scroll hint are pure CSS. JS sets one number.
  */
  const scrubEl = $('#scrub');
  if (scrubEl) {
    const video = $('#scrubVideo');
    const caps = $$('.scrub__cap', scrubEl);
    let target = 0, shown = 0, raf = null, metaReady = false;

    const giveUp = () => scrubEl.classList.add('is-static');

    function progress() {
      const rect = scrubEl.getBoundingClientRect();
      const travel = scrubEl.offsetHeight - window.innerHeight;
      if (travel <= 0) return 0;
      return Math.min(1, Math.max(0, -rect.top / travel));
    }

    function render() {
      shown += (target - shown) * 0.12;
      scrubEl.style.setProperty('--p', shown.toFixed(4));

      if (metaReady && video.duration) {
        // stop a touch short of the end: the very last frame often fails to decode
        const t = shown * (video.duration - 0.06);
        if (Math.abs(video.currentTime - t) > 0.01) {
          try { video.currentTime = t; } catch (err) { giveUp(); }
        }
      }

      const i = Math.min(caps.length - 1, Math.floor(shown * caps.length));
      caps.forEach((c, ci) => c.classList.toggle('is-on', ci === i));

      raf = Math.abs(target - shown) > 0.0004 ? requestAnimationFrame(render) : null;
    }

    function onScrubScroll() {
      target = progress();
      if (!raf) raf = requestAnimationFrame(render);
    }

    if (reduceMotion) {
      giveUp();
    } else {
      video.pause();
      const armScrub = () => { metaReady = true; onScrubScroll(); };
      // The hero loads this same clip, so on a warm cache the metadata is
      // already here and 'loadedmetadata' has fired before this line runs.
      // Listening alone would wait forever for an event that is in the past.
      if (video.readyState >= 1) armScrub();
      video.addEventListener('loadedmetadata', armScrub);
      video.addEventListener('error', giveUp);
      // a video that never buffers would leave a blank pinned screen
      setTimeout(() => { if (!metaReady) giveUp(); }, 8000);
      window.addEventListener('scroll', onScrubScroll, { passive: true });
      window.addEventListener('resize', onScrubScroll);
      onScrubScroll();
    }
  }

  /* ---------- Cost estimator ---------- */
  const est = $('#estimatorForm');
  if (est) {
    const area = $('#roofArea'), areaOut = $('#areaOut');
    const material = $('#roofMaterial');
    const pitch = $('#roofPitch');
    const stories = $('#roofStories'), storiesOut = $('#storiesOut');
    const out = $('#estimateOut');
    let pitchFactor = 1;
    function compute() {
      const sqft = parseFloat(area.value);
      const rate = parseFloat(material.value);
      const storyFactor = 1 + (parseInt(stories.value, 10) - 1) * 0.08;
      const base = sqft * rate * pitchFactor * storyFactor;
      const lo = Math.round(base * 0.92 / 100) * 100;
      const hi = Math.round(base * 1.12 / 100) * 100;
      areaOut.textContent = sqft.toLocaleString('en-US') + ' sq ft';
      storiesOut.textContent = stories.value;
      out.textContent = '$' + lo.toLocaleString('en-US') + ' – $' + hi.toLocaleString('en-US');
      bump(out);
    }
    [area, material, stories].forEach(el => el.addEventListener('input', compute));
    $$('button', pitch).forEach(b => b.addEventListener('click', () => {
      $$('button', pitch).forEach(x => { x.classList.remove('is-active'); x.setAttribute('aria-checked', 'false'); });
      b.classList.add('is-active'); b.setAttribute('aria-checked', 'true');
      pitchFactor = parseFloat(b.dataset.val);
      compute();
    }));
    compute();
  }

  /* ---------- VSL player + chapters ---------- */
  const vslFrame = $('#vslFrame');
  if (vslFrame) {
    const VSL_ID = 'ysz5S6PUM-U'; // replace with your own YouTube video id
    let vslStart = 0, vslIframe = null;
    function playVsl(start) {
      vslStart = start;
      if (vslIframe) vslIframe.remove();
      vslIframe = document.createElement('iframe');
      vslIframe.src = `https://www.youtube.com/embed/${VSL_ID}?autoplay=1&rel=0&modestbranding=1&start=${start}`;
      vslIframe.title = 'Rooftiq video: how we work';
      vslIframe.allow = 'autoplay; encrypted-media; picture-in-picture';
      vslIframe.allowFullscreen = true;
      vslFrame.appendChild(vslIframe);
      vslFrame.classList.add('is-playing');
    }
    $('#vslPlay').addEventListener('click', () => playVsl(vslStart));
    $$('#vslChapters button').forEach(b => b.addEventListener('click', () => {
      $$('#vslChapters button').forEach(x => x.classList.toggle('is-active', x === b));
      playVsl(parseInt(b.dataset.start, 10));
      if (window.innerWidth < 1024) vslFrame.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }));
  }

  /* ---------- Financing calculator ---------- */
  const fin = $('#financeCalc');
  if (fin) {
    const amt = $('#finAmount'), amtOut = $('#finAmountOut');
    const monthlyOut = $('#finMonthly'), interestOut = $('#finInterest');
    const plans = $$('#finPlan button');
    let months = 18, apr = 0;
    const money = n => '$' + Math.round(n).toLocaleString('en-US');
    function calc() {
      const P = parseFloat(amt.value);
      const r = apr / 100 / 12;
      const m = r === 0 ? P / months : (P * r) / (1 - Math.pow(1 + r, -months));
      amtOut.textContent = money(P);
      monthlyOut.textContent = money(m);
      interestOut.textContent = money(m * months - P);
      bump(monthlyOut); bump(interestOut);
    }
    amt.addEventListener('input', calc);
    plans.forEach(b => b.addEventListener('click', () => {
      plans.forEach(x => { x.classList.remove('is-active'); x.setAttribute('aria-checked', 'false'); });
      b.classList.add('is-active'); b.setAttribute('aria-checked', 'true');
      months = parseInt(b.dataset.months, 10); apr = parseFloat(b.dataset.apr);
      calc();
    }));
    calc();
  }

  /* ---------- Service areas: list <-> map sync ---------- */
  const areasList = $('#areasList');
  if (areasList) {
    const cityItems = $$('li', areasList);
    const pins = $$('.pin', $('#areasMap'));
    function setCity(city) {
      cityItems.forEach(li => li.classList.toggle('is-active', li.dataset.city === city));
      pins.forEach(p => p.classList.toggle('is-active', p.dataset.city === city));
    }
    cityItems.forEach(li => {
      li.addEventListener('mouseenter', () => setCity(li.dataset.city));
      li.addEventListener('click', () => setCity(li.dataset.city));
    });
    pins.forEach(p => {
      p.addEventListener('mouseenter', () => setCity(p.dataset.city));
      p.addEventListener('click', () => setCity(p.dataset.city));
    });
  }

  /* ---------- Sticky mobile CTA ---------- */
  const stickyCta = $('#stickyCta');
  if (stickyCta) {
    const contactSec = $('#contact');
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      const nearContact = contactSec && y + window.innerHeight > contactSec.offsetTop + 200;
      stickyCta.classList.toggle('is-visible', y > 500 && !nearContact);
    }, { passive: true });
  }

  /* ---------- Pricing toggle ---------- */
  const toggle = $('#priceToggle');
  if (toggle) {
    const sw = $('.toggle__switch', toggle);
    const labels = $$('.toggle__label', toggle);
    sw.addEventListener('click', () => {
      const on = sw.getAttribute('aria-checked') !== 'true';
      sw.setAttribute('aria-checked', String(on));
      labels.forEach(l => l.classList.toggle('is-active', (l.dataset.side === 'right') === on));
      $$('.price').forEach(p => {
        const target = on ? parseFloat(p.dataset.sqft) : parseFloat(p.dataset.project);
        const from = parseFloat(p.textContent.replace(/,/g, '')) || 0;
        const start = performance.now();
        const dec = on ? 2 : 0;
        (function tick(now) {
          const t = Math.min((now - start) / 500, 1);
          const e = 1 - Math.pow(1 - t, 3);
          p.textContent = (from + (target - from) * e).toFixed(dec);
          if (t < 1) requestAnimationFrame(tick);
        })(start);
      });
      $$('.price-unit').forEach(u => u.textContent = on ? '/Sq. Ft.' : '/Project');
    });
    labels.forEach(l => l.addEventListener('click', () => {
      const wantOn = l.dataset.side === 'right';
      if ((sw.getAttribute('aria-checked') === 'true') !== wantOn) sw.click();
    }));
  }

  /* ---------- Gallery filter + lightbox ---------- */
  const filters = $('#galleryFilters');
  const items = $$('.gallery__item');
  if (filters) {
    filters.addEventListener('click', (e) => {
      const btn = e.target.closest('button'); if (!btn) return;
      $$('button', filters).forEach(b => b.classList.toggle('is-active', b === btn));
      const f = btn.dataset.filter;
      items.forEach((it, i) => {
        const show = f === 'all' || it.dataset.cat === f;
        it.classList.toggle('is-hidden', !show);
        it.classList.remove('is-entering');
        if (show) { it.style.animationDelay = (i * 40) + 'ms'; void it.offsetWidth; it.classList.add('is-entering'); }
      });
    });
  }
  const lb = $('#lightbox'), lbImg = $('#lbImg'), lbCap = $('#lbCap');
  let lbIndex = 0;
  function visibleItems() { return items.filter(i => !i.classList.contains('is-hidden')); }
  function openLb(i) {
    const list = visibleItems(); if (!list.length) return;
    lbIndex = (i + list.length) % list.length;
    const it = list[lbIndex];
    const img = $('img', it);
    lbImg.src = it.dataset.full || img.src;
    lbImg.alt = img.alt;
    lbCap.textContent = $('figcaption strong', it).textContent;
    lb.hidden = false; document.body.style.overflow = 'hidden';
  }
  items.forEach((it) => it.addEventListener('click', () => openLb(visibleItems().indexOf(it))));
  $('#lbPrev').addEventListener('click', () => openLb(lbIndex - 1));
  $('#lbNext').addEventListener('click', () => openLb(lbIndex + 1));

  /* ---------- Overlays: close on backdrop / Esc, lightbox arrows ---------- */
  function closeOverlays() {
    if (!lb.hidden) { lb.hidden = true; document.body.style.overflow = ''; }
  }
  $$('[data-close]').forEach(el => el.addEventListener('click', closeOverlays));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverlays();
    if (!lb.hidden) { if (e.key === 'ArrowLeft') openLb(lbIndex - 1); if (e.key === 'ArrowRight') openLb(lbIndex + 1); }
  });

  /* ---------- Testimonials carousel ---------- */
  const track = $('#carouselTrack');
  if (track) {
    const slides = $$('.review', track);
    const dots = $('#carDots');
    let index = 0, perView = 3, autoTimer, startX = 0, dragX = 0, isDrag = false;
    function computePerView() {
      const w = window.innerWidth;
      perView = w <= 640 ? 1 : w <= 1024 ? 2 : 3;
    }
    function maxIndex() { return Math.max(0, slides.length - perView); }
    function buildDots() {
      dots.innerHTML = '';
      for (let i = 0; i <= maxIndex(); i++) {
        const d = document.createElement('button');
        d.type = 'button'; d.setAttribute('aria-label', 'Go to review ' + (i + 1));
        d.addEventListener('click', () => go(i));
        dots.appendChild(d);
      }
    }
    function go(i) {
      index = Math.max(0, Math.min(i, maxIndex()));
      const slideW = slides[0].getBoundingClientRect().width + 24;
      track.style.transform = `translateX(${-index * slideW}px)`;
      $$('button', dots).forEach((d, di) => d.classList.toggle('is-active', di === index));
    }
    function restartAuto() {
      clearInterval(autoTimer);
      if (!reduceMotion) autoTimer = setInterval(() => go(index >= maxIndex() ? 0 : index + 1), 5000);
    }
    $('#carPrev').addEventListener('click', () => { go(index - 1); restartAuto(); });
    $('#carNext').addEventListener('click', () => { go(index >= maxIndex() ? 0 : index + 1); restartAuto(); });
    track.addEventListener('pointerdown', (e) => { isDrag = true; startX = e.clientX; track.classList.add('is-dragging'); track.setPointerCapture(e.pointerId); });
    track.addEventListener('pointermove', (e) => {
      if (!isDrag) return; dragX = e.clientX - startX;
      const slideW = slides[0].getBoundingClientRect().width + 24;
      track.style.transform = `translateX(${-index * slideW + dragX}px)`;
    });
    function endDrag() {
      if (!isDrag) return; isDrag = false; track.classList.remove('is-dragging');
      if (dragX < -60) go(index + 1); else if (dragX > 60) go(index - 1); else go(index);
      dragX = 0; restartAuto();
    }
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);
    $('#carousel').addEventListener('mouseenter', () => clearInterval(autoTimer));
    $('#carousel').addEventListener('mouseleave', restartAuto);
    window.addEventListener('resize', () => { computePerView(); buildDots(); go(index); });
    computePerView(); buildDots(); go(0); restartAuto();
  }

  /* ---------- Accordion: only one open at a time ---------- */
  const acc = $('#accordion');
  if (acc) {
    $$('details', acc).forEach(d => d.addEventListener('toggle', () => {
      if (d.open) $$('details', acc).forEach(o => { if (o !== d) o.open = false; });
    }));
  }

  /* ---------- Quote form validation ---------- */
  const form = $('#quoteForm');
  if (form) {
    const fields = {
      qName: v => v.trim().length >= 2,
      qPhone: v => /^[\d\s()+\-.]{7,}$/.test(v.trim()),
      qEmail: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()),
      qService: v => v !== ''
    };
    function validate(id) {
      const el = $('#' + id); const ok = fields[id](el.value);
      el.closest('.field').classList.toggle('is-invalid', !ok);
      return ok;
    }
    Object.keys(fields).forEach(id => {
      const el = $('#' + id);
      el.addEventListener('input', () => { if (el.closest('.field').classList.contains('is-invalid')) validate(id); });
      el.addEventListener('blur', () => { if (el.value) validate(id); });
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const results = Object.keys(fields).map(validate);
      if (results.includes(false)) {
        showToast('Please fix the highlighted fields.');
        const first = $('.field.is-invalid input, .field.is-invalid select', form);
        if (first) first.focus();
        return;
      }
      const btn = $('#quoteSubmit');
      btn.classList.add('is-loading');
      setTimeout(() => {
        btn.classList.remove('is-loading');
        const urgent = $('#qUrgent').checked;
        showToast(urgent ? 'Request received. An on-call roofer will phone you within 15 minutes.' : 'Request sent. We\'ll call you back within one business hour.', 'success');
        form.reset();
        $$('.field', form).forEach(f => f.classList.remove('is-invalid'));
      }, 1100);
    });
  }

  /* ---------- Newsletter ---------- */
  const nl = $('#newsletterForm');
  if (nl) nl.addEventListener('submit', (e) => {
    e.preventDefault();
    const em = $('#nlEmail');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) { showToast('Enter a valid email to subscribe.'); em.focus(); return; }
    showToast('Subscribed. Watch for storm alerts and seasonal tips.', 'success');
    nl.reset();
  });

  /* ---------- Smooth anchors (the hero handles its own links) ---------- */
  $$('a[href^="#"]').forEach(a => {
    if (a.closest('#rq-hero')) return;
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = $(id); if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top, behavior: reduceMotion ? 'auto' : 'smooth' });
      history.replaceState(null, '', id);
    });
  });

  /* ---------- Image fallback (if a stock photo fails to load) ---------- */
  $$('img').forEach(img => {
    img.addEventListener('error', () => {
      if (img.dataset.fallen) return;
      img.dataset.fallen = '1';
      img.style.background = 'linear-gradient(135deg, #2a313b, #111418)';
      img.removeAttribute('src');
    });
  });

  onScroll();
})();
