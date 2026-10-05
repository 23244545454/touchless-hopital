/**
 * leap-gesture.js — Unified Leap Motion Controller Engine (Model LM-010 & Orion/Gemini)
 * Touchless Hospital Management System
 * 
 * Direct WebSocket client for Leap Motion Service on ws://127.0.0.1:6437/v6.json
 * Features:
 *   - Auto-reconnecting WebSocket client
 *   - Jitter-free 3D-to-2D screen coordinate mapping (low-pass smoothing)
 *   - Touchless cursor with dwell-time circle progress
 *   - Gestures: Push-Tap, Dwell-Click, Swipe-Left/Right/Up/Down, Pinch-Zoom, Open-Palm Hold
 *   - High-tech floating Leap HUD (shows connection status, 3D coordinates, gesture badge)
 *   - Full backward compatibility with existing wg-* window events
 */

(function (window, document) {
  'use strict';

  /* ─────────────────────────────────────────────────────────────
     CONFIGURATION & CONSTANTS
  ───────────────────────────────────────────────────────────── */
  const isHttps = window.location.protocol === 'https:';

  const WS_URLS = isHttps ? [
    'wss://127.0.0.1:6436/v6.json',
    'wss://localhost:6436/v6.json',
    'ws://127.0.0.1:6437/v6.json',
    'ws://localhost:6437/v6.json'
  ] : [
    'ws://127.0.0.1:6437/v6.json',
    'ws://localhost:6437/v6.json',
    'ws://127.0.0.1:6437/v7.json',
    'ws://127.0.0.1:6437'
  ];

  // 3D Interaction Box boundaries (millimeters)
  const BOUNDS = {
    xMin: -160, xMax: 160,  // horizontal width
    yMin:  110, yMax: 360,  // vertical height above sensor
    zMin: -100, zMax: 100   // depth toward/away from user
  };

  const CONFIG = {
    smoothingFactor: 0.32,     // EMA smoothing (0.0: freeze, 1.0: raw)
    dwellDurationMs: 1200,     // Dwell time over target to trigger click
    swipeVelocityMin: 320,     // mm/s threshold for swipes
    swipeCooldownMs: 450,      // debounce between swipes
    pushVelocityZ: -180,       // mm/s forward push to tap
    pinchThreshold: 0.70,      // Leap pinchStrength [0.0 - 1.0]
    palmHoldFrames: 25,        // frames of steady open palm for auth/ack
  };

  /* ─────────────────────────────────────────────────────────────
     AUDIO FEEDBACK (Web Audio API)
  ───────────────────────────────────────────────────────────── */
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) {}
    }
    return audioCtx;
  }

  function playTone(freq = 660, type = 'sine', duration = 0.12, vol = 0.25) {
    try {
      const ctx = getAudioCtx();
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {}
  }

  /* ─────────────────────────────────────────────────────────────
     ENGINE STATE
  ───────────────────────────────────────────────────────────── */
  const state = {
    connected: false,
    handPresent: false,
    handType: 'none',
    rawPos: { x: 0, y: 0, z: 0 },
    screenPos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    lastSwipeTime: 0,
    pinchActive: false,
    lastPinchDistance: null,
    palmFrames: 0,
    palmFired: false,
    fps: 0,
    frameCount: 0,
    activeDwellTarget: null,
    dwellStartTime: 0,
    dwellProgress: 0,
    lastGestureName: 'Ready',
  };

  let ws = null;
  let wsUrlIndex = 0;
  let reconnectTimer = null;
  let cursorEl = null;
  let cursorFillEl = null;
  let hudEl = null;

  /* ─────────────────────────────────────────────────────────────
     TOUCHLESS CURSOR INJECTION
  ───────────────────────────────────────────────────────────── */
  function ensureCursor() {
    cursorEl = document.getElementById('touchless-leap-cursor');
    if (!cursorEl) {
      cursorEl = document.createElement('div');
      cursorEl.id = 'touchless-leap-cursor';
      cursorEl.innerHTML = `
        <div class="tlc-ring"></div>
        <div class="tlc-dot"></div>
        <svg class="tlc-progress" viewBox="0 0 64 64">
          <circle class="tlc-track" cx="32" cy="32" r="28"/>
          <circle class="tlc-fill" cx="32" cy="32" r="28" id="tlc-fill-circle"/>
        </svg>
        <div class="tlc-label" id="tlc-cursor-label"></div>
      `;
      document.body.appendChild(cursorEl);
    }
    cursorFillEl = document.getElementById('tlc-fill-circle');

    /* Inject cursor & HUD CSS if not present */
    if (!document.getElementById('leap-gesture-styles')) {
      const style = document.createElement('style');
      style.id = 'leap-gesture-styles';
      style.textContent = `
        /* Touchless Leap Cursor */
        #touchless-leap-cursor {
          position: fixed;
          width: 64px; height: 64px;
          margin-left: -32px; margin-top: -32px;
          pointer-events: none;
          z-index: 100000;
          display: none;
          transform: translate3d(0, 0, 0);
          transition: transform 0.04s ease-out, opacity 0.25s ease;
        }
        #touchless-leap-cursor.visible { display: block; }
        .tlc-ring {
          position: absolute; inset: 10px;
          border-radius: 50%;
          border: 2px solid rgba(0, 212, 170, 0.7);
          box-shadow: 0 0 16px rgba(0, 212, 170, 0.5), inset 0 0 10px rgba(0, 212, 170, 0.2);
          transition: transform 0.15s ease, border-color 0.15s;
        }
        .tlc-dot {
          position: absolute; left: 50%; top: 50%;
          width: 8px; height: 8px; margin-left: -4px; margin-top: -4px;
          background: #00d4aa; border-radius: 50%;
          box-shadow: 0 0 10px #00d4aa;
        }
        .tlc-progress {
          position: absolute; inset: 0; width: 100%; height: 100%;
          transform: rotate(-90deg);
        }
        .tlc-track {
          fill: none; stroke: rgba(255, 255, 255, 0.1); stroke-width: 3.5;
        }
        .tlc-fill {
          fill: none; stroke: #00d4aa; stroke-width: 3.5;
          stroke-dasharray: 175.9; stroke-dashoffset: 175.9;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.05s linear;
        }
        .tlc-label {
          position: absolute; top: 70px; left: 50%;
          transform: translateX(-50%);
          background: rgba(5, 12, 24, 0.9);
          border: 1px solid rgba(0, 212, 170, 0.4);
          color: #00d4aa; font-family: 'Inter', sans-serif;
          font-size: 0.68rem; font-weight: 700;
          padding: 0.2rem 0.6rem; border-radius: 100px;
          white-space: nowrap; pointer-events: none; opacity: 0;
          transition: opacity 0.2s ease;
        }
        .tlc-label.active { opacity: 1; }
        #touchless-leap-cursor.pinching .tlc-ring {
          border-color: #3b82f6; transform: scale(0.7);
        }
        #touchless-leap-cursor.pushing .tlc-ring {
          border-color: #f59e0b; transform: scale(1.3);
          box-shadow: 0 0 24px #f59e0b;
        }

        /* Floating Leap Motion HUD */
        #leap-hud {
          position: fixed; bottom: 20px; right: 20px;
          z-index: 99999; width: 290px;
          background: rgba(5, 12, 24, 0.92);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(0, 212, 170, 0.35);
          border-radius: 14px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.65), 0 0 0 1px rgba(0,212,170,0.1);
          color: #f0f6ff; font-family: 'Inter', system-ui, sans-serif;
          user-select: none; overflow: hidden;
          transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease;
        }
        #leap-hud.minimized {
          width: auto;
        }
        #leap-hud.minimized #lhud-body { display: none !important; }
        #lhud-header {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.65rem 0.9rem;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(0,212,170,0.15);
          cursor: pointer;
        }
        #lhud-status-dot {
          width: 9px; height: 9px; border-radius: 50%;
          background: #ef4444; flex-shrink: 0;
          box-shadow: 0 0 8px rgba(239, 68, 68, 0.7);
          transition: background 0.3s, box-shadow 0.3s;
        }
        #lhud-status-dot.connected {
          background: #00d4aa;
          box-shadow: 0 0 10px rgba(0, 212, 170, 0.9);
          animation: lhud-pulse 1.8s infinite ease-in-out;
        }
        @keyframes lhud-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.15); }
        }
        #lhud-title {
          font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em;
          text-transform: uppercase; color: #00d4aa; flex: 1;
        }
        #lhud-badge {
          font-size: 0.62rem; font-weight: 700; padding: 0.15rem 0.5rem;
          border-radius: 100px; background: rgba(0,212,170,0.15);
          color: #00d4aa; border: 1px solid rgba(0,212,170,0.3);
        }
        #lhud-toggle {
          background: none; border: none; color: #94a3b8;
          font-size: 0.8rem; cursor: pointer; padding: 0.1rem 0.3rem;
          border-radius: 4px; line-height: 1;
        }
        #lhud-toggle:hover { color: #fff; background: rgba(255,255,255,0.08); }

        #lhud-body {
          padding: 0.75rem 0.9rem;
          display: flex; flex-direction: column; gap: 0.6rem;
        }
        .lhud-row {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 0.72rem; color: #94a3b8;
        }
        .lhud-val {
          font-family: monospace; font-size: 0.75rem; font-weight: 600; color: #f0f6ff;
        }
        .lhud-gesture-banner {
          background: rgba(0, 212, 170, 0.08);
          border: 1px dashed rgba(0, 212, 170, 0.35);
          border-radius: 8px; padding: 0.45rem 0.6rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        .lhud-gb-lbl { font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
        .lhud-gb-val { font-size: 0.78rem; font-weight: 700; color: #00d4aa; }
        .lhud-guide {
          font-size: 0.65rem; color: #64748b; line-height: 1.4;
          border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem;
        }
        .lhud-guide span { color: #94a3b8; font-weight: 600; }
      `;
      document.head.appendChild(style);
    }
  }

  /* ─────────────────────────────────────────────────────────────
     FLOATING LEAP MOTION HUD
  ───────────────────────────────────────────────────────────── */
  function buildHUD() {
    ensureCursor();
    hudEl = document.getElementById('leap-hud');
    if (hudEl) return;

    hudEl = document.createElement('div');
    hudEl.id = 'leap-hud';
    hudEl.innerHTML = `
      <div id="lhud-header">
        <span id="lhud-status-dot"></span>
        <span id="lhud-title">Leap Motion LM-010</span>
        <span id="lhud-badge">Searching</span>
        <button id="lhud-toggle" title="Minimize / Expand">—</button>
      </div>
      <div id="lhud-body">
        <div class="lhud-gesture-banner">
          <span class="lhud-gb-lbl">Active Gesture</span>
          <span class="lhud-gb-val" id="lhud-gesture-val">None</span>
        </div>
        <div class="lhud-row">
          <span>Hand Tracking:</span>
          <span class="lhud-val" id="lhud-hand-val">No Hand Detected</span>
        </div>
        <div class="lhud-row">
          <span>Coordinates (X, Y, Z):</span>
          <span class="lhud-val" id="lhud-pos-val">—</span>
        </div>
        <div class="lhud-row">
          <span>Service Port:</span>
          <span class="lhud-val" id="lhud-port-val">ws://127.0.0.1:6437</span>
        </div>
        <div class="lhud-guide">
          👉 <span>Point & Dwell</span> over buttons to click<br>
          👈👉 <span>Swipe Left / Right</span> to change patient<br>
          🤌 <span>Pinch</span> to zoom scans · ✋ <span>Open Palm</span> acknowledge
        </div>
      </div>
    `;
    document.body.appendChild(hudEl);

    // Minimize toggle
    document.getElementById('lhud-toggle').addEventListener('click', (e) => {
      e.stopPropagation();
      hudEl.classList.toggle('minimized');
    });
    document.getElementById('lhud-header').addEventListener('click', () => {
      if (hudEl.classList.contains('minimized')) hudEl.classList.remove('minimized');
    });
  }

  function updateHUD() {
    if (!hudEl) return;
    const dot = document.getElementById('lhud-status-dot');
    const badge = document.getElementById('lhud-badge');
    const handVal = document.getElementById('lhud-hand-val');
    const posVal = document.getElementById('lhud-pos-val');
    const gestureVal = document.getElementById('lhud-gesture-val');

    if (state.connected) {
      dot.className = 'connected';
      badge.textContent = 'Connected';
      badge.style.color = '#00d4aa';
      badge.style.borderColor = 'rgba(0,212,170,0.5)';
      badge.style.background = 'rgba(0,212,170,0.15)';
    } else {
      dot.className = '';
      badge.textContent = 'Disconnected';
      badge.style.color = '#ef4444';
      badge.style.borderColor = 'rgba(239,68,68,0.5)';
      badge.style.background = 'rgba(239,68,68,0.15)';
    }

    if (gestureVal) gestureVal.textContent = state.lastGestureName;

    if (state.handPresent) {
      if (handVal) handVal.textContent = `${state.handType.toUpperCase()} HAND (120 Hz)`;
      if (posVal) posVal.textContent = `${Math.round(state.rawPos.x)}, ${Math.round(state.rawPos.y)}, ${Math.round(state.rawPos.z)}`;
    } else {
      if (handVal) handVal.textContent = state.connected ? 'Place hand above sensor' : 'Service offline';
      if (posVal) posVal.textContent = '—';
    }
  }

  /* ─────────────────────────────────────────────────────────────
     WEBSOCKET CLIENT
  ───────────────────────────────────────────────────────────── */
  function connectWebSocket() {
    clearTimeout(reconnectTimer);
    const targetUrl = WS_URLS[wsUrlIndex % WS_URLS.length];

    try {
      ws = new WebSocket(targetUrl);
    } catch (err) {
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      state.connected = true;
      updateHUD();
      console.log(`[LeapMotion] Connected to ${targetUrl}`);
      // Request gestures & background tracking
      try {
        ws.send(JSON.stringify({ enableGestures: true }));
        ws.send(JSON.stringify({ background: true }));
        ws.send(JSON.stringify({ optimizeHMD: false }));
      } catch (e) {}
      showToast('🟢 Leap Motion Connected');
      playTone(580, 'sine', 0.15);
    };

    ws.onmessage = (event) => {
      try {
        const frame = JSON.parse(event.data);
        handleLeapFrame(frame);
      } catch (err) {}
    };

    ws.onclose = () => {
      state.connected = false;
      state.handPresent = false;
      if (cursorEl) cursorEl.classList.remove('visible');
      updateHUD();
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }

  function scheduleReconnect() {
    wsUrlIndex++;
    reconnectTimer = setTimeout(connectWebSocket, 2000);
  }

  /* ─────────────────────────────────────────────────────────────
     FRAME PROCESSOR & 3D NORMALIZATION
  ───────────────────────────────────────────────────────────── */
  function handleLeapFrame(frame) {
    if (!frame || !frame.hands) return;

    if (frame.hands.length === 0) {
      if (state.handPresent) {
        state.handPresent = false;
        cancelDwell();
        if (cursorEl) cursorEl.classList.remove('visible');
        updateHUD();
      }
      return;
    }

    state.handPresent = true;
    const hand = frame.hands[0];
    state.handType = hand.type || 'right';

    // Extract Palm Position & Velocity
    const [rawX, rawY, rawZ] = hand.palmPosition;
    state.rawPos = { x: rawX, y: rawY, z: rawZ };

    // Find Index Finger Tip (if available) for precision pointing
    let pointX = rawX;
    let pointY = rawY;
    let pointZ = rawZ;

    if (frame.pointables && frame.pointables.length > 0) {
      // Find index finger (type 1) or first extended pointable
      const indexFinger = frame.pointables.find(p => p.type === 1 || p.id === hand.pointables?.[1]) || frame.pointables[0];
      if (indexFinger && indexFinger.tipPosition) {
        pointX = indexFinger.tipPosition[0];
        pointY = indexFinger.tipPosition[1];
        pointZ = indexFinger.tipPosition[2];
      }
    }

    // ── 3D to 2D Screen Normalization ──
    const normX = Math.max(0, Math.min(1, (pointX - BOUNDS.xMin) / (BOUNDS.xMax - BOUNDS.xMin)));
    const normY = Math.max(0, Math.min(1, 1 - (pointY - BOUNDS.yMin) / (BOUNDS.yMax - BOUNDS.yMin)));

    const targetScreenX = normX * window.innerWidth;
    const targetScreenY = normY * window.innerHeight;

    // Exponential Moving Average smoothing
    state.screenPos.x += (targetScreenX - state.screenPos.x) * CONFIG.smoothingFactor;
    state.screenPos.y += (targetScreenY - state.screenPos.y) * CONFIG.smoothingFactor;

    // Render Cursor
    renderCursor(state.screenPos.x, state.screenPos.y);

    // Process Interactions
    processDwell(state.screenPos.x, state.screenPos.y);
    processPushTap(hand, pointZ);
    processSwipes(hand, frame.gestures);
    processPinch(hand);
    processOpenPalm(hand, frame.pointables);

    updateHUD();
  }

  /* ─────────────────────────────────────────────────────────────
     RENDER CURSOR
  ───────────────────────────────────────────────────────────── */
  function renderCursor(x, y) {
    if (!cursorEl) return;
    cursorEl.classList.add('visible');
    cursorEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;

    // Dispatch cursor move event
    window.dispatchEvent(new CustomEvent('touchless-move', {
      detail: { x, y, raw: state.rawPos }
    }));
  }

  /* ─────────────────────────────────────────────────────────────
     DWELL SELECTION (Hover 1.2s to Click)
  ───────────────────────────────────────────────────────────── */
  function processDwell(x, y) {
    const el = document.elementFromPoint(x, y);
    const target = el ? el.closest('.gesture-target, .gesture-btn, button, .ntb-link, .ntb-logout, .demo-account, .ptab, .or-ctrl-btn, .bed-cell') : null;

    if (target && target === state.activeDwellTarget) {
      const elapsed = Date.now() - state.dwellStartTime;
      const progress = Math.min(1, elapsed / CONFIG.dwellDurationMs);
      state.dwellProgress = progress;

      // Update circular SVG fill
      if (cursorFillEl) {
        const circumference = 175.9; // 2 * PI * 28
        cursorFillEl.style.strokeDashoffset = circumference * (1 - progress);
      }

      if (progress >= 1) {
        // Trigger Click!
        triggerClick(target);
        cancelDwell();
      }
    } else if (target) {
      // New target entered
      cancelDwell();
      state.activeDwellTarget = target;
      state.dwellStartTime = Date.now();
      playTone(480, 'sine', 0.05, 0.1);
    } else {
      cancelDwell();
    }
  }

  function cancelDwell() {
    state.activeDwellTarget = null;
    state.dwellStartTime = 0;
    state.dwellProgress = 0;
    if (cursorFillEl) cursorFillEl.style.strokeDashoffset = 175.9;
  }

  function triggerClick(el) {
    el.click();
    playTone(880, 'sine', 0.15, 0.35);
    flashElement(el);
    setGestureLabel('👆 Selection Confirmed');
    showToast(`Activated: ${el.textContent.trim().slice(0, 24)}`);
  }

  function flashElement(el) {
    const originalShadow = el.style.boxShadow;
    const originalBorder = el.style.borderColor;
    el.style.boxShadow = '0 0 0 3px #00d4aa, 0 0 25px rgba(0, 212, 170, 0.6)';
    el.style.borderColor = '#00d4aa';
    setTimeout(() => {
      el.style.boxShadow = originalShadow;
      el.style.borderColor = originalBorder;
    }, 450);
  }

  /* ─────────────────────────────────────────────────────────────
     PUSH TAP (Plunge along Z axis)
  ───────────────────────────────────────────────────────────── */
  let lastPointZ = 0;
  function processPushTap(hand, pointZ) {
    const dz = pointZ - lastPointZ;
    lastPointZ = pointZ;

    // Detect forward thrust
    if (dz < -22 && pointZ < -15) {
      if (cursorEl) cursorEl.classList.add('pushing');
      setTimeout(() => { if (cursorEl) cursorEl.classList.remove('pushing'); }, 200);

      const el = document.elementFromPoint(state.screenPos.x, state.screenPos.y);
      const target = el ? el.closest('.gesture-target, .gesture-btn, button, .ntb-link, .ptab, .or-ctrl-btn') : null;
      if (target) {
        triggerClick(target);
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────
     SWIPE DETECTION
  ───────────────────────────────────────────────────────────── */
  function processSwipes(hand, gestures) {
    const now = Date.now();
    if (now - state.lastSwipeTime < CONFIG.swipeCooldownMs) return;

    const [vx, vy] = hand.palmVelocity || [0, 0, 0];

    // Check Built-in Leap Gestures if present
    if (gestures && gestures.length > 0) {
      for (const g of gestures) {
        if (g.type === 'swipe' && g.state === 'stop') {
          const dirX = g.direction[0];
          if (dirX > 0.6) { triggerSwipe('right'); return; }
          if (dirX < -0.6) { triggerSwipe('left'); return; }
        }
      }
    }

    // Velocity-based fallback
    if (Math.abs(vx) > CONFIG.swipeVelocityMin && Math.abs(vx) > Math.abs(vy) * 1.5) {
      if (vx > 0) {
        triggerSwipe('right');
      } else {
        triggerSwipe('left');
      }
    } else if (Math.abs(vy) > CONFIG.swipeVelocityMin && Math.abs(vy) > Math.abs(vx) * 1.5) {
      if (vy > 0) {
        triggerSwipe('up');
      } else {
        triggerSwipe('down');
      }
    }
  }

  function triggerSwipe(dir) {
    state.lastSwipeTime = Date.now();
    cancelDwell();

    if (dir === 'left') {
      playTone(540, 'triangle', 0.16);
      setGestureLabel('👉 Swipe Left — Next');
      showToast('👉 Swipe Left (Next Record)');
      // Emit backward-compatible event for dashboard-doctor
      window.dispatchEvent(new CustomEvent('wg-swipe-left', { detail: { dir } }));
      window.dispatchEvent(new CustomEvent('touchless-swipe', { detail: { direction: 'left' } }));
    } else if (dir === 'right') {
      playTone(420, 'triangle', 0.16);
      setGestureLabel('👈 Swipe Right — Prev');
      showToast('👈 Swipe Right (Previous Record)');
      // Emit backward-compatible event for dashboard-doctor
      window.dispatchEvent(new CustomEvent('wg-swipe-right', { detail: { dir } }));
      window.dispatchEvent(new CustomEvent('touchless-swipe', { detail: { direction: 'right' } }));
    } else if (dir === 'up') {
      playTone(600, 'sine', 0.12);
      window.scrollBy({ top: -200, behavior: 'smooth' });
      setGestureLabel('⬆ Scroll Up');
    } else if (dir === 'down') {
      playTone(360, 'sine', 0.12);
      window.scrollBy({ top: 200, behavior: 'smooth' });
      setGestureLabel('⬇ Scroll Down');
    }
  }

  /* ─────────────────────────────────────────────────────────────
     PINCH DETECTION (Zoom / Select)
  ───────────────────────────────────────────────────────────── */
  function processPinch(hand) {
    const pinch = hand.pinchStrength || 0;
    if (pinch > CONFIG.pinchThreshold) {
      if (!state.pinchActive) {
        state.pinchActive = true;
        if (cursorEl) cursorEl.classList.add('pinching');
        playTone(720, 'sine', 0.1);
        setGestureLabel('🤌 Pinch Active');
        window.dispatchEvent(new CustomEvent('wg-pinch', { detail: { strength: pinch } }));
        window.dispatchEvent(new CustomEvent('touchless-pinch', { detail: { strength: pinch, state: 'start' } }));
      }
    } else {
      if (state.pinchActive) {
        state.pinchActive = false;
        if (cursorEl) cursorEl.classList.remove('pinching');
        window.dispatchEvent(new CustomEvent('touchless-pinch', { detail: { state: 'end' } }));
      }
    }
  }

  /* ─────────────────────────────────────────────────────────────
     OPEN PALM DETECTION (Hold steady for Alarm Ack / Auth)
  ───────────────────────────────────────────────────────────── */
  function processOpenPalm(hand, pointables) {
    const grab = hand.grabStrength || 0;
    const pinch = hand.pinchStrength || 0;
    const extendedCount = pointables ? pointables.filter(p => p.extended).length : 5;

    // Hand is open if 4-5 fingers extended and grab/pinch are near zero
    const isOpen = extendedCount >= 4 && grab < 0.25 && pinch < 0.25;

    if (isOpen) {
      state.palmFrames++;
      if (state.palmFrames >= CONFIG.palmHoldFrames && !state.palmFired) {
        state.palmFired = true;
        playTone(880, 'sine', 0.22, 0.4);
        setGestureLabel('✋ Open Palm — Confirmed');
        showToast('✋ Open Palm Confirmed');
        window.dispatchEvent(new CustomEvent('wg-palm', { detail: { hand } }));
        window.dispatchEvent(new CustomEvent('touchless-palm', { detail: { hand } }));
      }
    } else {
      state.palmFrames = 0;
      state.palmFired = false;
    }
  }

  /* ─────────────────────────────────────────────────────────────
     UI HELPERS & TOAST
  ───────────────────────────────────────────────────────────── */
  function setGestureLabel(text) {
    state.lastGestureName = text;
    const cursorLabel = document.getElementById('tlc-cursor-label');
    if (cursorLabel) {
      cursorLabel.textContent = text;
      cursorLabel.classList.add('active');
      clearTimeout(cursorLabel._t);
      cursorLabel._t = setTimeout(() => cursorLabel.classList.remove('active'), 1800);
    }
  }

  let toastTimer = null;
  function showToast(msg) {
    let toast = document.getElementById('gesture-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'gesture-toast';
      toast.style.cssText = `
        position:fixed; top:20px; left:50%; transform:translateX(-50%);
        background:rgba(5,12,24,0.92); border:1px solid rgba(0,212,170,0.5);
        color:#00d4aa; padding:0.6rem 1.6rem; border-radius:100px;
        font-family:'Inter',sans-serif; font-size:0.85rem; font-weight:700;
        letter-spacing:0.04em; z-index:999999; backdrop-filter:blur(12px);
        box-shadow:0 8px 30px rgba(0,0,0,0.5); pointer-events:none;
        transition:opacity 0.3s ease; opacity:0;
      `;
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
  }

  /* ─────────────────────────────────────────────────────────────
     PUBLIC API
  ───────────────────────────────────────────────────────────── */
  window.LeapGesture = {
    connect: connectWebSocket,
    getState: () => ({ ...state }),
    playTone,
    showToast,
  };

  /* Auto-init on DOM ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      buildHUD();
      connectWebSocket();
    });
  } else {
    buildHUD();
    connectWebSocket();
  }

})(window, document);
