/* ============================================================
   TOUCHLESS HMS — Login Page JavaScript
   Handles: role switching, form validation, gesture modal,
            demo accounts, animated canvas background
   ============================================================ */

(function () {
  'use strict';

  /* ── Role Configuration ── */
  const ROLES = {
    patient: {
      icon: '🧑‍⚕️',
      title: 'Patient Login',
      desc: 'Sign in to your patient portal',
      idLabel: 'Patient ID / Civil ID',
      idHint: 'Enter your Civil ID or assigned Patient ID',
      placeholder: 'e.g. P-2024-00123',
      btnText: 'Sign In as Patient',
      dashboardUrl: 'dashboard-patient.html',
      showGesture: false,
    },
    doctor: {
      icon: '👨‍⚕️',
      title: 'Doctor Login',
      desc: 'Sign in to your clinical dashboard',
      idLabel: 'Doctor ID / Staff Number',
      idHint: 'Enter your hospital staff number or Doctor ID',
      placeholder: 'e.g. DR-0087',
      btnText: 'Sign In as Doctor',
      dashboardUrl: 'dashboard-doctor.html',
      showGesture: false,
    },
    nurse: {
      icon: '💉',
      title: 'Nurse Login',
      desc: 'Sign in to the nurse station',
      idLabel: 'Nurse ID / Staff Number',
      idHint: 'Enter your hospital staff number or Nurse ID',
      placeholder: 'e.g. NR-0042',
      btnText: 'Sign In as Nurse',
      dashboardUrl: 'dashboard-nurse.html',
      showGesture: false,
    },
    surgeon: {
      icon: '✋',
      title: 'Surgeon Login',
      desc: 'Sign in to the sterile OR interface',
      idLabel: 'Surgeon ID / Staff Number',
      idHint: 'Enter your hospital staff number or Surgeon ID',
      placeholder: 'e.g. SG-0011',
      btnText: 'Sign In as Surgeon',
      dashboardUrl: 'dashboard-surgeon.html',
      showGesture: true,
    },
  };

  /* ── State ── */
  let currentRole = 'patient';
  let isLoading = false;

  /* ── DOM References ── */
  const roleIcon       = document.getElementById('role-icon');
  const roleTitle      = document.getElementById('role-title');
  const roleDesc       = document.getElementById('role-desc');
  const idLabel        = document.getElementById('id-label');
  const idHint         = document.getElementById('id-hint');
  const userIdInput    = document.getElementById('user-id');
  const passwordInput  = document.getElementById('user-password');
  const loginBtn       = document.getElementById('login-btn');
  const loginBtnText   = document.getElementById('login-btn-text');
  const btnLoader      = document.getElementById('btn-loader');
  const formError      = document.getElementById('form-error');
  const errorText      = document.getElementById('error-text');
  const gestureToggle  = document.getElementById('gesture-toggle');
  const gestureModal   = document.getElementById('gesture-modal');
  const modalBackdrop  = document.getElementById('modal-backdrop');
  const gestureStatus  = document.getElementById('gesture-status');
  const gestureProgress= document.getElementById('gesture-progress');

  const sidechips      = document.querySelectorAll('.role-chip[data-role]');
  const tabBtns        = document.querySelectorAll('.role-tab[data-role]');

  /* ── Apply Role ── */
  function applyRole(role) {
    currentRole = role;
    const cfg = ROLES[role];

    /* Update card header */
    roleIcon.textContent      = cfg.icon;
    roleTitle.textContent     = cfg.title;
    roleDesc.textContent      = cfg.desc;
    idLabel.textContent       = cfg.idLabel;
    idHint.textContent        = cfg.idHint;
    userIdInput.placeholder   = cfg.placeholder;
    loginBtnText.textContent  = cfg.btnText;

    /* Gesture toggle */
    gestureToggle.style.display = cfg.showGesture ? 'block' : 'none';

    /* Highlight side chips */
    sidechips.forEach(c => c.classList.toggle('active', c.dataset.role === role));
    tabBtns.forEach(t => {
      t.classList.toggle('active', t.dataset.role === role);
      t.setAttribute('aria-pressed', t.dataset.role === role ? 'true' : 'false');
    });

    /* Clear errors */
    hideError();
    userIdInput.classList.remove('error');
    passwordInput.classList.remove('error');
  }

  /* ── Role Chip Clicks (side panel) ── */
  sidechips.forEach(chip => {
    chip.addEventListener('click', () => applyRole(chip.dataset.role));
  });

  /* ── Role Tab Clicks (card) ── */
  tabBtns.forEach(tab => {
    tab.addEventListener('click', () => applyRole(tab.dataset.role));
  });

  /* ── Password Toggle ── */
  const togglePwd = document.getElementById('toggle-pwd');
  const eyeIcon   = document.getElementById('eye-icon');
  togglePwd.addEventListener('click', () => {
    const isPass = passwordInput.type === 'password';
    passwordInput.type = isPass ? 'text' : 'password';
    eyeIcon.textContent = isPass ? '🙈' : '👁️';
  });

  /* ── Error Helpers ── */
  function showError(msg) {
    errorText.textContent = msg;
    formError.style.display = 'flex';
    formError.style.animation = 'none';
    void formError.offsetWidth; // reflow
    formError.style.animation = 'shake 0.4s ease';
  }
  function hideError() {
    formError.style.display = 'none';
  }

  /* ── Form Validation ── */
  function validateForm() {
    let valid = true;
    hideError();
    userIdInput.classList.remove('error');
    passwordInput.classList.remove('error');

    if (!userIdInput.value.trim()) {
      userIdInput.classList.add('error');
      showError('Please enter your ' + ROLES[currentRole].idLabel);
      valid = false;
    } else if (!passwordInput.value.trim()) {
      passwordInput.classList.add('error');
      showError('Please enter your password.');
      valid = false;
    } else if (passwordInput.value.length < 6) {
      passwordInput.classList.add('error');
      showError('Password must be at least 6 characters.');
      valid = false;
    }
    return valid;
  }

  /* ── Form Submit ── */
  const loginForm = document.getElementById('login-form');
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validateForm()) return;

    /* Simulate login */
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      /* Redirect to dashboard mockup */
      window.location.href = ROLES[currentRole].dashboardUrl + '?role=' + currentRole;
    }, 1800);
  });

  function setLoading(state) {
    isLoading = state;
    loginBtn.disabled = state;
    loginBtnText.style.display = state ? 'none' : 'inline';
    document.querySelector('.btn-login-icon').style.display = state ? 'none' : 'inline';
    btnLoader.style.display = state ? 'inline-flex' : 'none';
  }

  /* ── Demo Accounts ── */
  const demoButtons = document.querySelectorAll('.demo-account');
  demoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      applyRole(role);
      userIdInput.value = btn.dataset.email;
      passwordInput.value = btn.dataset.pass;
      passwordInput.type = 'text';
      eyeIcon.textContent = '🙈';
      hideError();
      /* Flash the button */
      btn.style.background = 'rgba(0,212,170,0.15)';
      btn.style.borderColor = 'rgba(0,212,170,0.5)';
      setTimeout(() => {
        btn.style.background = '';
        btn.style.borderColor = '';
      }, 600);
    });
  });

  /* ── Gesture Auth Modal ── */
  const gestureAuthBtn  = document.getElementById('gesture-auth-btn');
  const gestureCloseBtn = document.getElementById('gesture-modal-close');
  let gestureTimer = null;
  let gestureInterval = null;

  function openGestureModal() {
    gestureModal.style.display   = 'flex';
    modalBackdrop.style.display  = 'block';
    gestureProgress.style.width  = '0%';
    gestureStatus.textContent    = 'Hold your open hand steady above the Leap Motion sensor…';
    startGestureSimulation();
  }

  function closeGestureModal() {
    gestureModal.style.display  = 'none';
    modalBackdrop.style.display = 'none';
    clearTimeout(gestureTimer);
    clearInterval(gestureInterval);
    gestureProgress.style.width = '0%';
  }

  function startGestureSimulation() {
    let progress = 0;
    const phases = ['Detecting hand…', 'Hand locked ✋', 'Verifying identity…', 'Authenticated ✅'];

    // Fast-track if real Leap Motion hand is detected
    window.addEventListener('touchless-palm', () => {
      progress = 95;
      gestureStatus.textContent = 'Leap Motion Palm Verified ✅';
      gestureProgress.style.width = '100%';
      clearInterval(gestureInterval);
      setTimeout(() => {
        closeGestureModal();
        window.location.href = 'dashboard-surgeon.html?role=surgeon&auth=leap';
      }, 500);
    }, { once: true });

    gestureInterval = setInterval(() => {
      progress += 1;
      gestureProgress.style.width = progress + '%';

      if (progress === 25) { gestureStatus.textContent = phases[1]; }
      if (progress === 55) { gestureStatus.textContent = phases[2]; }
      if (progress === 90) { gestureStatus.textContent = phases[3]; }

      if (progress >= 100) {
        clearInterval(gestureInterval);
        gestureTimer = setTimeout(() => {
          closeGestureModal();
          window.location.href = 'dashboard-surgeon.html?role=surgeon&auth=gesture';
        }, 600);
      }
    }, 50);
  }

  if (gestureAuthBtn) {
    gestureAuthBtn.addEventListener('click', openGestureModal);
  }
  if (gestureCloseBtn) {
    gestureCloseBtn.addEventListener('click', closeGestureModal);
  }
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeGestureModal);
  }

  /* Close on Escape */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeGestureModal();
  });

  /* ── Animated Particle Canvas ── */
  const canvas = document.getElementById('login-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    let W, H, particles;

    function resize() {
      W = canvas.width  = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function createParticles() {
      particles = Array.from({ length: 55 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.5 + 0.4,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        alpha: Math.random() * 0.5 + 0.15,
        color: Math.random() > 0.5 ? '0,212,170' : '59,130,246',
      }));
    }

    function drawParticles() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.color},${p.alpha})`;
        ctx.fill();

        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = W;
        if (p.x > W) p.x = 0;
        if (p.y < 0) p.y = H;
        if (p.y > H) p.y = 0;
      });

      /* Draw connecting lines */
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0,212,170,${0.06 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(drawParticles);
    }

    resize();
    createParticles();
    drawParticles();
    window.addEventListener('resize', () => { resize(); createParticles(); });
  }

  /* ── Init ── */
  applyRole('patient');

})();
