/* ============================================================
   webcam-gesture.js — Real Webcam Hand Tracking Engine
   Uses: MediaPipe Hands (CDN)
   Detects: swipe-left, swipe-right, open-palm, pinch
   Emits:   window events  →  { type: 'wg-swipe-left' }  etc.
   ============================================================ */
(function () {
  'use strict';

  /* ── Config ── */
  const SWIPE_THRESHOLD  = 0.18;  // fraction of frame width
  const PINCH_THRESHOLD  = 0.06;  // normalised distance
  const DWELL_FRAMES     = 18;    // ~0.6s at 30fps for palm-hold

  /* ── State ── */
  let handResults        = null;
  let prevIndexX         = null;
  let swipeCooldown      = 0;
  let palmHoldFrames     = 0;
  let palmFired          = false;
  let pinchActive        = false;
  let cameraRunning      = false;
  let lastGestureLabel   = 'No Hand';
  let onGestureCallback  = null;

  /* ── Public API ── */
  window.WGesture = {
    start,
    stop,
    onGesture: (fn) => { onGestureCallback = fn; },
    getLabel:  () => lastGestureLabel,
    isRunning: () => cameraRunning,
  };

  /* ─────────────────────────────────────────────
     DOM PANEL (floating webcam widget)
  ───────────────────────────────────────────── */
  function buildPanel() {
    const panel = document.createElement('div');
    panel.id = 'wg-panel';
    panel.innerHTML = `
      <div id="wg-header">
        <span id="wg-status-dot"></span>
        <span id="wg-title">Hand Tracking</span>
        <button id="wg-minimize" title="Minimize">—</button>
        <button id="wg-close"    title="Stop Camera">✕</button>
      </div>
      <div id="wg-body">
        <div id="wg-vid-wrap">
          <video id="wg-video" autoplay playsinline muted></video>
          <canvas id="wg-canvas"></canvas>
          <div id="wg-gesture-badge">No Hand</div>
        </div>
        <div id="wg-legend">
          <div class="wg-leg"><span>👋</span> Open Palm — Pause</div>
          <div class="wg-leg"><span>👈</span> Swipe Left — Next</div>
          <div class="wg-leg"><span>👉</span> Swipe Right — Prev</div>
          <div class="wg-leg"><span>🤌</span> Pinch — Select</div>
        </div>
      </div>
      <div id="wg-start-prompt">
        <div id="wg-cam-icon">📷</div>
        <p>Click to enable<br><strong>live hand tracking</strong></p>
        <button id="wg-start-btn">Start Camera</button>
      </div>
    `;
    document.body.appendChild(panel);

    /* Inject styles */
    const style = document.createElement('style');
    style.textContent = `
      #wg-panel {
        position: fixed; bottom: 95px; right: 18px; z-index: 9990;
        width: 280px; border-radius: 16px;
        background: rgba(5,12,24,0.92); backdrop-filter: blur(18px);
        border: 1px solid rgba(0,212,170,0.35);
        box-shadow: 0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,212,170,0.1);
        font-family: 'Inter', sans-serif; user-select: none; overflow: hidden;
        transition: height 0.3s ease, box-shadow 0.3s;
      }
      #wg-panel.minimized #wg-body,
      #wg-panel.minimized #wg-start-prompt { display: none !important; }
      #wg-header {
        display: flex; align-items: center; gap: 0.5rem;
        padding: 0.6rem 0.85rem; border-bottom: 1px solid rgba(0,212,170,0.15);
        cursor: move;
      }
      #wg-status-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: #475569; flex-shrink: 0;
        transition: background 0.4s, box-shadow 0.4s;
      }
      #wg-status-dot.active {
        background: #00d4aa;
        box-shadow: 0 0 8px rgba(0,212,170,0.8);
        animation: wg-pulse 1.5s ease infinite;
      }
      @keyframes wg-pulse { 0%,100%{opacity:1}50%{opacity:0.5} }
      #wg-title { font-size: 0.75rem; font-weight: 700; color: #00d4aa; flex:1; letter-spacing:.05em; text-transform:uppercase; }
      #wg-minimize, #wg-close {
        background: none; border: none; color: #64748b; font-size: 0.85rem;
        cursor: pointer; padding: 0.1rem 0.35rem; border-radius: 4px;
        line-height: 1; transition: color 0.2s, background 0.2s;
      }
      #wg-minimize:hover { color: #f0f6ff; background: rgba(255,255,255,0.06); }
      #wg-close:hover    { color: #f87171; background: rgba(239,68,68,0.08); }

      #wg-body { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.6rem; }
      #wg-vid-wrap {
        position: relative; width: 100%; aspect-ratio: 4/3; border-radius: 10px;
        overflow: hidden; background: #000; border: 1px solid rgba(0,212,170,0.2);
      }
      #wg-video  { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
      #wg-canvas { position: absolute; inset: 0; width: 100%; height: 100%; transform: scaleX(-1); }
      #wg-gesture-badge {
        position: absolute; bottom: 8px; left: 50%; transform: translateX(-50%);
        background: rgba(0,0,0,0.7); border: 1px solid rgba(0,212,170,0.4);
        color: #00d4aa; font-size: 0.68rem; font-weight: 800;
        padding: 0.2rem 0.75rem; border-radius: 100px;
        text-transform: uppercase; letter-spacing: 0.1em; white-space: nowrap;
        transition: background 0.3s, color 0.3s;
      }
      #wg-gesture-badge.active {
        background: rgba(0,212,170,0.2); color: #fff;
        box-shadow: 0 0 12px rgba(0,212,170,0.5);
      }
      #wg-legend { display: flex; flex-direction: column; gap: 0.3rem; }
      .wg-leg { font-size: 0.65rem; color: #64748b; display: flex; align-items: center; gap: 0.4rem; }
      .wg-leg span { font-size: 0.85rem; }

      #wg-start-prompt {
        display: flex; flex-direction: column; align-items: center; gap: 0.65rem;
        padding: 1.5rem 1rem; text-align: center;
      }
      #wg-cam-icon { font-size: 2rem; }
      #wg-start-prompt p { font-size: 0.78rem; color: #94a3b8; line-height: 1.5; margin: 0; }
      #wg-start-prompt strong { color: #f0f6ff; }
      #wg-start-btn {
        padding: 0.55rem 1.4rem; background: linear-gradient(135deg,#00d4aa,#3b82f6);
        border: none; border-radius: 100px; color: #fff; font-size: 0.8rem;
        font-weight: 700; cursor: pointer; font-family: inherit; letter-spacing: 0.04em;
        transition: opacity 0.2s, transform 0.2s;
      }
      #wg-start-btn:hover { opacity: 0.9; transform: scale(1.03); }
    `;
    document.head.appendChild(style);

    /* Controls */
    document.getElementById('wg-start-btn').addEventListener('click', start);
    document.getElementById('wg-close').addEventListener('click', stop);
    document.getElementById('wg-minimize').addEventListener('click', () => {
      panel.classList.toggle('minimized');
    });

    /* Drag */
    makeDraggable(panel, document.getElementById('wg-header'));

    return panel;
  }

  /* ─────────────────────────────────────────────
     DRAGGABLE
  ───────────────────────────────────────────── */
  function makeDraggable(el, handle) {
    let ox = 0, oy = 0;
    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      ox = e.clientX - el.getBoundingClientRect().left;
      oy = e.clientY - el.getBoundingClientRect().top;
      const onMove = (e2) => {
        el.style.left   = (e2.clientX - ox) + 'px';
        el.style.top    = (e2.clientY - oy) + 'px';
        el.style.right  = 'auto';
        el.style.bottom = 'auto';
      };
      const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup',   onUp);
    });
  }

  /* ─────────────────────────────────────────────
     START
  ───────────────────────────────────────────── */
  async function start() {
    if (cameraRunning) return;

    const panel = document.getElementById('wg-panel') || buildPanel();

    /* Show body, hide prompt */
    document.getElementById('wg-body').style.display = 'flex';
    document.getElementById('wg-start-prompt').style.display = 'none';

    const video  = document.getElementById('wg-video');
    const canvas = document.getElementById('wg-canvas');
    const badge  = document.getElementById('wg-gesture-badge');
    const dot    = document.getElementById('wg-status-dot');

    /* Webcam */
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { width:320, height:240, facingMode:'user' }, audio:false });
    } catch (err) {
      badge.textContent = '❌ Camera denied';
      badge.classList.add('active');
      return;
    }
    video.srcObject = stream;
    await new Promise(r => video.addEventListener('loadedmetadata', r, { once:true }));

    cameraRunning = true;
    dot.classList.add('active');

    /* Wait for MediaPipe */
    await waitForMediaPipe();

    const ctx = canvas.getContext('2d');

    /* MediaPipe Hands */
    const hands = new Hands({
      locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${f}`
    });
    hands.setOptions({
      maxNumHands:       1,
      modelComplexity:   1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence:  0.5,
    });
    hands.onResults((results) => {
      handResults = results;
      drawResults(ctx, canvas, results, badge);
      processGestures(results, badge);
    });

    const camUtil = new Camera(video, {
      onFrame: async () => { await hands.send({ image: video }); },
      width: 320, height: 240,
    });
    camUtil.start();

    /* Store refs for stop() */
    window._wgStream  = stream;
    window._wgCamera  = camUtil;
    window._wgHands   = hands;
  }

  /* ─────────────────────────────────────────────
     STOP
  ───────────────────────────────────────────── */
  function stop() {
    if (window._wgStream) { window._wgStream.getTracks().forEach(t => t.stop()); window._wgStream = null; }
    if (window._wgCamera) { try { window._wgCamera.stop(); } catch(e){} window._wgCamera = null; }
    cameraRunning = false;
    const dot = document.getElementById('wg-status-dot');
    if (dot) dot.classList.remove('active');
    /* Show prompt again */
    const body   = document.getElementById('wg-body');
    const prompt = document.getElementById('wg-start-prompt');
    if (body)   body.style.display   = 'none';
    if (prompt) prompt.style.display = 'flex';
    const badge = document.getElementById('wg-gesture-badge');
    if (badge) { badge.textContent = 'Camera Off'; badge.classList.remove('active'); }
    const canvas = document.getElementById('wg-canvas');
    if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
  }

  /* ─────────────────────────────────────────────
     DRAW SKELETON
  ───────────────────────────────────────────── */
  const CONNECTIONS = [
    [0,1],[1,2],[2,3],[3,4],         // thumb
    [0,5],[5,6],[6,7],[7,8],         // index
    [0,9],[9,10],[10,11],[11,12],    // middle
    [0,13],[13,14],[14,15],[15,16],  // ring
    [0,17],[17,18],[18,19],[19,20],  // pinky
    [5,9],[9,13],[13,17],            // palm
  ];

  function drawResults(ctx, canvas, results, badge) {
    canvas.width  = canvas.offsetWidth  || 280;
    canvas.height = canvas.offsetHeight || 210;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) return;

    const lms = results.multiHandLandmarks[0];
    const W = canvas.width, H = canvas.height;

    /* Skeleton lines */
    ctx.strokeStyle = 'rgba(0,212,170,0.6)';
    ctx.lineWidth   = 2;
    CONNECTIONS.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(lms[a].x * W, lms[a].y * H);
      ctx.lineTo(lms[b].x * W, lms[b].y * H);
      ctx.stroke();
    });

    /* Joints */
    lms.forEach((lm, i) => {
      ctx.beginPath();
      ctx.arc(lm.x * W, lm.y * H, i === 0 ? 6 : 4, 0, Math.PI * 2);
      ctx.fillStyle = i === 0 ? '#3b82f6' : (i % 4 === 0 ? '#f59e0b' : '#00d4aa');
      ctx.fill();
    });
  }

  /* ─────────────────────────────────────────────
     GESTURE CLASSIFICATION
  ───────────────────────────────────────────── */
  function processGestures(results, badge) {
    if (swipeCooldown > 0) swipeCooldown--;

    if (!results.multiHandLandmarks || !results.multiHandLandmarks.length) {
      prevIndexX    = null;
      palmHoldFrames = 0;
      palmFired     = false;
      pinchActive   = false;
      setLabel(badge, 'No Hand', false);
      return;
    }

    const lms = results.multiHandLandmarks[0];

    /* ── Landmarks ── */
    const wrist   = lms[0];
    const thumb   = lms[4];
    const index   = lms[8];
    const middle  = lms[12];
    const ring    = lms[16];
    const pinky   = lms[20];

    /* ── 1. PINCH (thumb tip ↔ index tip) ── */
    const pinchDist = dist(thumb, index);
    if (pinchDist < PINCH_THRESHOLD) {
      if (!pinchActive) {
        pinchActive = true;
        fire('pinch');
        setLabel(badge, '🤌 Pinch — Select', true);
      }
    } else {
      pinchActive = false;
    }

    /* ── 2. OPEN PALM (all fingers extended upward) ── */
    const allExtended =
      index.y  < wrist.y - 0.1 &&
      middle.y < wrist.y - 0.1 &&
      ring.y   < wrist.y - 0.1 &&
      pinky.y  < wrist.y - 0.1 &&
      thumb.x  < index.x - 0.03; // thumb splayed outward (mirrored)

    if (allExtended) {
      palmHoldFrames++;
      if (palmHoldFrames >= DWELL_FRAMES && !palmFired) {
        palmFired = true;
        fire('palm');
        setLabel(badge, '✋ Open Palm — Pause', true);
      } else if (!palmFired) {
        setLabel(badge, `✋ Hold... ${Math.round((palmHoldFrames/DWELL_FRAMES)*100)}%`, false);
      }
    } else {
      palmHoldFrames = 0;
      palmFired      = false;
    }

    /* ── 3. SWIPE (index fingertip horizontal movement) ── */
    const curX = index.x;
    if (prevIndexX !== null && swipeCooldown === 0) {
      const dx = curX - prevIndexX;
      if (Math.abs(dx) > SWIPE_THRESHOLD) {
        if (dx > 0) {
          fire('swipe-right');
          setLabel(badge, '👈 Swipe Right — Prev', true);
        } else {
          fire('swipe-left');
          setLabel(badge, '👉 Swipe Left — Next', true);
        }
        swipeCooldown = 20;
        prevIndexX = null;
        return;
      }
    }
    prevIndexX = curX;

    /* Default label if no gesture matched */
    if (!allExtended && !pinchActive && swipeCooldown === 0) {
      setLabel(badge, '✋ Hand Detected', false);
    }
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, (a.z||0) - (b.z||0));
  }

  function setLabel(badge, text, active) {
    if (!badge) return;
    lastGestureLabel    = text;
    badge.textContent   = text;
    badge.classList.toggle('active', active);
    if (onGestureCallback) onGestureCallback(text, active);
  }

  /* ─────────────────────────────────────────────
     FIRE WINDOW EVENTS
  ───────────────────────────────────────────── */
  function fire(type) {
    window.dispatchEvent(new CustomEvent('wg-' + type, { detail: { type } }));
  }

  /* ─────────────────────────────────────────────
     WAIT FOR MEDIAPIPE SCRIPT
  ───────────────────────────────────────────── */
  function waitForMediaPipe() {
    return new Promise((resolve) => {
      if (typeof Hands !== 'undefined' && typeof Camera !== 'undefined') return resolve();
      const interval = setInterval(() => {
        if (typeof Hands !== 'undefined' && typeof Camera !== 'undefined') {
          clearInterval(interval);
          resolve();
        }
      }, 100);
    });
  }

  /* ─────────────────────────────────────────────
     AUTO-INIT PANEL ON DOM READY
  ───────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildPanel);
  } else {
    buildPanel();
  }

})();
