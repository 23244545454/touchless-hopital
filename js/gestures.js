// ============================================================
// gestures.js — Touchless gesture simulation engine
// Uses Handtrack.js (webcam) with mouse-movement fallback
// ============================================================

const GestureEngine = (() => {

  /* ── Web Audio feedback ── */
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }
  function playBeep(freq = 660, type = 'sine', duration = 0.12, vol = 0.4) {
    const ctx = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(); osc.stop(ctx.currentTime + duration);
  }

  /* ── Visual flash ── */
  function flashElement(el, color = '#00d4aa') {
    el.style.transition = 'box-shadow 0.08s ease, border-color 0.08s ease';
    el.style.boxShadow = `0 0 0 3px ${color}, 0 0 30px ${color}55`;
    el.style.borderColor = color;
    setTimeout(() => {
      el.style.boxShadow = '';
      el.style.borderColor = '';
    }, 500);
  }

  /* ── Gesture State ── */
  const state = {
    mode: 'mouse', // 'mouse' | 'webcam'
    lastX: null, lastY: null,
    swipeThreshold: 80,
    onGesture: null,
  };

  /* ── Gesture Callbacks ── */
  const handlers = {};
  function on(gesture, fn) { handlers[gesture] = fn; }
  function emit(gesture, data) {
    if (handlers[gesture]) handlers[gesture](data);
    if (state.onGesture) state.onGesture(gesture, data);
  }

  /* ── Mouse Simulation Mode ── */
  let mouseDown = false, mouseStartX = 0, mouseStartY = 0;
  let pointerEl = null;
  let hoverTimer = null;

  function initMouseMode(canvas) {
    pointerEl = canvas;

    canvas.addEventListener('mousedown', e => {
      mouseDown = true;
      mouseStartX = e.clientX; mouseStartY = e.clientY;
    });

    canvas.addEventListener('mousemove', e => {
      // Move pointer cursor on canvas
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      drawPointer(canvas, px, py);

      // Hover-to-select: hover over buttons
      clearTimeout(hoverTimer);
      const el = document.elementFromPoint(e.clientX, e.clientY);
      if (el && el.classList.contains('gesture-btn')) {
        hoverTimer = setTimeout(() => {
          el.click();
          playBeep(800, 'sine', 0.15);
          flashElement(el);
          emit('select', { element: el });
        }, 900);
      }
    });

    canvas.addEventListener('mouseup', e => {
      if (!mouseDown) return;
      mouseDown = false;
      const dx = e.clientX - mouseStartX;
      const dy = e.clientY - mouseStartY;
      const absDx = Math.abs(dx), absDy = Math.abs(dy);

      if (absDx > state.swipeThreshold && absDx > absDy) {
        const dir = dx > 0 ? 'right' : 'left';
        playBeep(dir === 'right' ? 520 : 420, 'triangle', 0.18);
        emit('swipe', { direction: dir, distance: absDx });
        showGestureLabel(canvas, `↔ Swipe ${dir.toUpperCase()}`);
      } else if (absDy > state.swipeThreshold && absDy > absDx) {
        const dir = dy > 0 ? 'down' : 'up';
        playBeep(dir === 'down' ? 360 : 600, 'triangle', 0.18);
        emit('swipe', { direction: dir, distance: absDy });
        showGestureLabel(canvas, `↕ Swipe ${dir.toUpperCase()}`);
      } else if (absDx < 15 && absDy < 15) {
        playBeep(880, 'sine', 0.1);
        emit('tap', { x: e.clientX, y: e.clientY });
        showGestureLabel(canvas, '👆 TAP / SELECT');
      }
    });

    // Pinch simulation: scroll wheel
    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const dir = e.deltaY < 0 ? 'in' : 'out';
      playBeep(dir === 'in' ? 700 : 500, 'sine', 0.12);
      emit('pinch', { direction: dir });
      showGestureLabel(canvas, `🤏 PINCH ${dir.toUpperCase()}`);
    }, { passive: false });
  }

  /* ── Draw hand pointer on canvas ── */
  function drawPointer(canvas, x, y) {
    const ctx2d = canvas.getContext('2d');
    ctx2d.clearRect(0, 0, canvas.width, canvas.height);
    // Glow ring
    const grad = ctx2d.createRadialGradient(x, y, 4, x, y, 30);
    grad.addColorStop(0, 'rgba(0,212,170,0.7)');
    grad.addColorStop(1, 'rgba(0,212,170,0)');
    ctx2d.beginPath(); ctx2d.arc(x, y, 30, 0, Math.PI * 2);
    ctx2d.fillStyle = grad; ctx2d.fill();
    // Center dot
    ctx2d.beginPath(); ctx2d.arc(x, y, 6, 0, Math.PI * 2);
    ctx2d.fillStyle = '#00d4aa'; ctx2d.fill();
    // Cross hairs
    ctx2d.strokeStyle = 'rgba(0,212,170,0.5)'; ctx2d.lineWidth = 1.5;
    ctx2d.beginPath(); ctx2d.moveTo(x-18,y); ctx2d.lineTo(x+18,y); ctx2d.stroke();
    ctx2d.beginPath(); ctx2d.moveTo(x,y-18); ctx2d.lineTo(x,y+18); ctx2d.stroke();
  }

  /* ── Gesture label overlay ── */
  let labelTimeout;
  function showGestureLabel(canvas, text) {
    let label = document.getElementById('gesture-label');
    if (!label) {
      label = document.createElement('div');
      label.id = 'gesture-label';
      label.style.cssText = `
        position:fixed; bottom:2rem; left:50%; transform:translateX(-50%);
        background:rgba(0,212,170,0.15); border:1px solid rgba(0,212,170,0.4);
        backdrop-filter:blur(12px); color:#00d4aa; font-family:'Inter',sans-serif;
        font-size:1.1rem; font-weight:700; padding:0.6rem 1.75rem;
        border-radius:100px; letter-spacing:0.08em; z-index:9999;
        pointer-events:none; transition:opacity 0.3s ease;
      `;
      document.body.appendChild(label);
    }
    label.textContent = text;
    label.style.opacity = '1';
    clearTimeout(labelTimeout);
    labelTimeout = setTimeout(() => { label.style.opacity = '0'; }, 2000);
  }

  /* ── Webcam + Handtrack.js Mode ── */
  async function initWebcamMode(videoEl, canvas, statusEl) {
    if (typeof handTrack === 'undefined') {
      if (statusEl) statusEl.textContent = 'Handtrack.js not loaded. Using mouse mode.';
      return false;
    }
    const modelParams = {
      flipHorizontal: true, maxNumBoxes: 1,
      iouThreshold: 0.5, scoreThreshold: 0.75,
    };
    try {
      const model = await handTrack.load(modelParams);
      const started = await handTrack.startVideo(videoEl);
      if (!started) { if (statusEl) statusEl.textContent = 'Camera denied. Mouse mode active.'; return false; }
      if (statusEl) statusEl.textContent = '📷 Webcam active — move your hand!';
      state.mode = 'webcam';

      let prevX = null;
      async function detect() {
        const predictions = await model.detect(videoEl);
        const ctx2d = canvas.getContext('2d');
        ctx2d.clearRect(0, 0, canvas.width, canvas.height);
        if (predictions.length > 0) {
          const [bx, by, bw, bh] = predictions[0].bbox;
          const cx = bx + bw / 2, cy = by + bh / 2;
          drawPointer(canvas, cx, cy);
          if (prevX !== null) {
            const dx = cx - prevX;
            if (Math.abs(dx) > 50) {
              const dir = dx > 0 ? 'right' : 'left';
              emit('swipe', { direction: dir });
              showGestureLabel(canvas, `↔ Swipe ${dir.toUpperCase()}`);
              playBeep(dir === 'right' ? 520 : 420, 'triangle', 0.18);
            }
          }
          prevX = cx;
        }
        requestAnimationFrame(detect);
      }
      detect();
      return true;
    } catch(e) {
      if (statusEl) statusEl.textContent = 'Camera error. Using mouse mode.';
      return false;
    }
  }

  return { initMouseMode, initWebcamMode, on, playBeep, flashElement, showGestureLabel };
})();
