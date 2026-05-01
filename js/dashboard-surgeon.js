/* dashboard-surgeon.js — Surgeon OR Interface Logic */
(function () {
  'use strict';

  const CIRCUMFERENCE = 163;
  const DWELL_MS = 1500;
  let dwellTimer = null, dwellTarget = null;

  /* ── OR Clock & Elapsed Timer ── */
  const orStart = new Date();
  orStart.setHours(8, 15, 0, 0);

  function updateClock() {
    const now = new Date();
    const clockEl = document.getElementById('or-clock');
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });

    const diff = Math.max(0, Math.floor((now - orStart) / 1000));
    const hh = String(Math.floor(diff / 3600)).padStart(2, '0');
    const mm = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
    const ss = String(diff % 60).padStart(2, '0');
    const elapsed = `${hh}:${mm}:${ss}`;
    const el = document.getElementById('or-elapsed');
    const fe = document.getElementById('or-footer-elapsed');
    if (el) el.textContent = elapsed;
    if (fe) fe.textContent = `Surgery Start: 08:15 · Elapsed: ${elapsed}`;
  }
  updateClock(); setInterval(updateClock, 1000);

  /* ── Live Vitals Simulation ── */
  const vitals = { hr: 76, spo2: 98, temp: 36.4, etco2: 32 };
  function updateVitals() {
    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    set('or-hr',   Math.round(vitals.hr   + (Math.random() - 0.5) * 8));
    set('or-spo2', Math.round(vitals.spo2 + (Math.random() - 0.5) * 2));
    set('or-temp', (vitals.temp + (Math.random() - 0.5) * 0.3).toFixed(1));
    set('or-etco2',Math.round(vitals.etco2 + (Math.random() - 0.5) * 4));
  }
  setInterval(updateVitals, 2500);

  /* ── Toast ── */
  const toast = document.getElementById('gesture-toast');
  let toastT;
  function showToast(msg) {
    if (!toast) return;
    toast.textContent = msg; toast.style.opacity = '1';
    clearTimeout(toastT); toastT = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
  }

  /* ── Floating Cursor + Dwell ── */
  const cursor = document.getElementById('gesture-cursor');
  const gcFill = document.getElementById('gc-fill-el');
  if (cursor) cursor.style.display = 'block';

  document.addEventListener('mousemove', (e) => {
    if (cursor) { cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el && el.closest('.gesture-target');
    if (target && target !== dwellTarget) startDwell(target);
    else if (!target && dwellTarget) cancelDwell();
  });

  function startDwell(el) {
    cancelDwell(); dwellTarget = el; let elapsed = 0;
    /* Show dwell progress bar on buttons */
    const after = el.querySelector ? el : null;
    dwellTimer = setInterval(() => {
      elapsed += 30;
      if (gcFill) gcFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - elapsed / DWELL_MS);
      /* Progress on button underline */
      if (elapsed >= DWELL_MS) {
        cancelDwell(); el.click();
        GestureEngine.playBeep(800, 'sine', 0.15);
        showToast('✋ Gesture Activated');
      }
    }, 30);
  }

  function cancelDwell() {
    clearInterval(dwellTimer); dwellTimer = null; dwellTarget = null;
    if (gcFill) gcFill.style.strokeDashoffset = CIRCUMFERENCE;
  }

  /* ── Control Button Actions ── */
  const actionLog = document.getElementById('or-action-log');
  function logAction(msg) {
    if (actionLog) {
      actionLog.textContent = `[${new Date().toLocaleTimeString('en-US',{hour12:false})}] ${msg}`;
    }
    showToast(msg);
  }

  const ACTIONS = {
    next:       () => logAction('⏭ Next patient record loaded'),
    imaging:    () => logAction('📷 Imaging panel opened — CT Chest'),
    anesthesia: () => logAction('💉 Anesthesia log — Propofol 200mg/hr'),
    notes:      () => logAction('📝 Surgical notes panel opened'),
    alarm:      () => { logAction('🚨 Alarm acknowledged'); GestureEngine.playBeep(440,'triangle',0.18); },
    meds:       () => logAction('💊 Medication schedule reviewed'),
  };

  document.querySelectorAll('.or-ctrl-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fn = ACTIONS[btn.dataset.action];
      if (fn) fn();
      GestureEngine.playBeep(880, 'sine', 0.1);
      /* Flash */
      btn.style.borderColor = 'var(--teal)';
      btn.style.background  = 'rgba(0,212,170,0.12)';
      setTimeout(() => { btn.style.borderColor = ''; btn.style.background = ''; }, 500);
    });
  });

  /* ── Gesture Canvas (swipe = navigate) ── */
  const canvas = document.getElementById('gesture-canvas');
  if (canvas) {
    /* Resize canvas to fill its container */
    function resizeCanvas() {
      canvas.width  = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight || 70;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    GestureEngine.initMouseMode(canvas);
    GestureEngine.on('swipe', d => {
      if (d.direction === 'right') logAction('⬅ Swipe: previous record');
      if (d.direction === 'left')  logAction('➡ Swipe: next record');
      if (d.direction === 'up')    logAction('⬆ Swipe: scroll up');
      if (d.direction === 'down')  logAction('⬇ Swipe: scroll down');
    });
    GestureEngine.on('tap',   () => logAction('👆 Tap: element selected'));
    GestureEngine.on('pinch', d => logAction(`🤏 Pinch ${d.direction}: imaging zoom`));
  }

  /* ── Init ── */
  showToast('✋ Gesture mode active — Sterile OR');

})();
