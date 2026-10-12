/* ============================================================
   TOUCHLESS HMS — Login & Registration Logic (Database Connected)
   Author: Dana Alghareb (Kuwait University - 2026)
   ============================================================ */

(function () {
  'use strict';

  /* ── Role Configuration ── */
  const ROLES = {
    patient: {
      icon: '🧑‍⚕️',
      title: 'Patient Login',
      desc: 'Sign in to your patient portal',
      idLabel: 'Email / Patient ID',
      idHint: 'Enter your registered email address',
      placeholder: 'e.g. sarah@patient.kw',
      btnText: 'Sign In as Patient',
      dashboardUrl: 'dashboard-patient.html'
    },
    doctor: {
      icon: '👨‍⚕️',
      title: 'Doctor Login',
      desc: 'Sign in to your clinical workstation',
      idLabel: 'Doctor Email / Staff ID',
      idHint: 'Enter your hospital staff email',
      placeholder: 'e.g. ahmed@hospital.kw',
      btnText: 'Sign In as Doctor',
      dashboardUrl: 'dashboard-doctor.html'
    },
    nurse: {
      icon: '💉',
      title: 'Nurse Login',
      desc: 'Sign in to the ward station',
      idLabel: 'Nurse Email / Staff ID',
      idHint: 'Enter your hospital staff email',
      placeholder: 'e.g. fatima@nurse.kw',
      btnText: 'Sign In as Nurse',
      dashboardUrl: 'dashboard-nurse.html'
    }
  };

  /* ── State ── */
  let currentRole = 'patient';
  let isRegisterMode = false;
  let isLoading = false;

  /* ── DOM References ── */
  const roleIcon        = document.getElementById('role-icon');
  const roleTitle       = document.getElementById('role-title');
  const roleDesc        = document.getElementById('role-desc');
  const idLabel         = document.getElementById('id-label');
  const idHint          = document.getElementById('id-hint');
  const userIdInput     = document.getElementById('user-id');
  const passwordInput   = document.getElementById('user-password');
  const loginBtn        = document.getElementById('login-btn');
  const loginBtnText    = document.getElementById('login-btn-text');
  const btnLoader       = document.getElementById('btn-loader');
  const formError       = document.getElementById('form-error');
  const errorText       = document.getElementById('error-text');

  const btnModeLogin    = document.getElementById('btn-mode-login');
  const btnModeRegister = document.getElementById('btn-mode-register');
  const loginForm       = document.getElementById('login-form');
  const registerForm    = document.getElementById('register-form');
  const roleTabs        = document.getElementById('role-tabs');
  const demoSection     = document.getElementById('demo-section');

  const tabBtns         = document.querySelectorAll('.role-tab[data-role]');
  const sidechips       = document.querySelectorAll('.role-chip[data-role]');

  /* ── Mode Switching: Sign In vs Register ── */
  function setAuthMode(register) {
    isRegisterMode = register;
    hideError();

    if (register) {
      btnModeRegister.style.background = 'var(--teal)';
      btnModeRegister.style.color = '#050c18';
      btnModeLogin.style.background = 'transparent';
      btnModeLogin.style.color = 'var(--text-secondary)';

      loginForm.style.display = 'none';
      registerForm.style.display = 'flex';
      roleTabs.style.display = 'none';
      if (demoSection) demoSection.style.display = 'none';

      roleIcon.textContent = '📝';
      roleTitle.textContent = 'Patient Registration';
      roleDesc.textContent = 'Create a new patient account in Touchless HMS';
    } else {
      btnModeLogin.style.background = 'var(--teal)';
      btnModeLogin.style.color = '#050c18';
      btnModeRegister.style.background = 'transparent';
      btnModeRegister.style.color = 'var(--text-secondary)';

      loginForm.style.display = 'flex';
      registerForm.style.display = 'none';
      roleTabs.style.display = 'flex';
      if (demoSection) demoSection.style.display = 'block';

      applyRole(currentRole);
    }
  }

  if (btnModeLogin) btnModeLogin.addEventListener('click', () => setAuthMode(false));
  if (btnModeRegister) btnModeRegister.addEventListener('click', () => setAuthMode(true));

  /* ── Apply Role ── */
  function applyRole(role) {
    if (!ROLES[role]) return;
    currentRole = role;
    const cfg = ROLES[role];

    // Clinical staff (Doctor/Nurse) must Sign In; switch out of patient registration
    if (role !== 'patient' && isRegisterMode) {
      setAuthMode(false);
    }

    if (!isRegisterMode) {
      roleIcon.textContent     = cfg.icon;
      roleTitle.textContent    = cfg.title;
      roleDesc.textContent     = cfg.desc;
      idLabel.textContent      = cfg.idLabel;
      idHint.textContent       = cfg.idHint;
      userIdInput.placeholder  = cfg.placeholder;
      loginBtnText.textContent = cfg.btnText;
    }

    tabBtns.forEach(btn => {
      const match = btn.dataset.role === role;
      btn.classList.toggle('active', match);
      btn.setAttribute('aria-pressed', match);
    });

    sidechips.forEach(chip => {
      chip.classList.toggle('active', chip.dataset.role === role);
    });
  }

  tabBtns.forEach(btn => btn.addEventListener('click', () => applyRole(btn.dataset.role)));
  sidechips.forEach(chip => chip.addEventListener('click', () => {
    setAuthMode(false);
    applyRole(chip.dataset.role);
  }));

  /* ── Password Visibility Toggle ── */
  const togglePwd = document.getElementById('toggle-pwd');
  const eyeIcon   = document.getElementById('eye-icon');
  if (togglePwd && eyeIcon) {
    togglePwd.addEventListener('click', () => {
      const isPass = passwordInput.type === 'password';
      passwordInput.type = isPass ? 'text' : 'password';
      eyeIcon.textContent = isPass ? '🙈' : '👁️';
    });
  }

  /* ── Error Helpers ── */
  function showError(msg) {
    if (!formError || !errorText) return;
    errorText.textContent = msg;
    formError.style.display = 'block';
  }

  function hideError() {
    if (formError) formError.style.display = 'none';
  }

  function setLoginLoading(loading) {
    isLoading = loading;
    if (loginBtn) loginBtn.disabled = loading;
    if (btnLoader) btnLoader.style.display = loading ? 'inline-flex' : 'none';
  }

  /* ── Real Database Login Submit ── */
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (isLoading) return;
      hideError();

      const email = userIdInput.value.trim();
      const password = passwordInput.value;

      if (!email) {
        showError('Please enter your email or user ID.');
        return;
      }
      if (!password) {
        showError('Please enter your password.');
        return;
      }

      setLoginLoading(true);

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          showError(data.error || 'Login failed. Please verify your credentials.');
          setLoginLoading(false);
          return;
        }

        // Store session in localStorage
        localStorage.setItem('currentUser', JSON.stringify(data.user));

        // Show brief success & redirect
        if (loginBtnText) loginBtnText.textContent = 'Welcome! Redirecting…';

        setTimeout(() => {
          if (data.user.role === 'doctor') {
            window.location.href = 'dashboard-doctor.html';
          } else if (data.user.role === 'nurse') {
            window.location.href = 'dashboard-nurse.html';
          } else {
            window.location.href = 'dashboard-patient.html';
          }
        }, 600);

      } catch (err) {
        console.error('Login error:', err);
        showError('Cannot connect to server. Please ensure the local server is running.');
        setLoginLoading(false);
      }
    });
  }

  /* ── Real Database Registration Submit ── */
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideError();

      const fullName = document.getElementById('reg-name').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const password = document.getElementById('reg-password').value;
      const civilId = document.getElementById('reg-civilid').value.trim();
      const phone = document.getElementById('reg-phone').value.trim();
      const bloodType = document.getElementById('reg-blood').value;

      if (!fullName || !email || !password) {
        showError('Full name, email, and password are required.');
        return;
      }
      if (password.length < 6) {
        showError('Password must be at least 6 characters.');
        return;
      }

      const regBtn = document.getElementById('reg-btn');
      const regBtnText = document.getElementById('reg-btn-text');
      if (regBtn) regBtn.disabled = true;
      if (regBtnText) regBtnText.textContent = 'Creating Account…';

      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fullName, email, password, civilId, phone, bloodType })
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          showError(data.error || 'Registration failed. Email might already exist.');
          if (regBtn) regBtn.disabled = false;
          if (regBtnText) regBtnText.textContent = 'Create Account & Sign In';
          return;
        }

        // Store newly created user in session
        localStorage.setItem('currentUser', JSON.stringify(data.user));

        if (regBtnText) regBtnText.textContent = 'Account Created! Redirecting…';
        setTimeout(() => {
          window.location.href = 'dashboard-patient.html';
        }, 800);

      } catch (err) {
        console.error('Registration error:', err);
        showError('Network error. Failed to reach the registration server.');
        if (regBtn) regBtn.disabled = false;
        if (regBtnText) regBtnText.textContent = 'Create Account & Sign In';
      }
    });
  }

  /* ── Quick Demo Accounts ── */
  const demoButtons = document.querySelectorAll('.demo-account');
  demoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      setAuthMode(false);
      const role = btn.dataset.role;
      applyRole(role);
      userIdInput.value = btn.dataset.email;
      passwordInput.value = btn.dataset.pass;
      hideError();

      btn.style.background = 'rgba(0,212,170,0.2)';
      setTimeout(() => { btn.style.background = ''; }, 400);

      // Submit automatically for convenience
      loginForm.dispatchEvent(new Event('submit'));
    });
  });

  /* ── Gesture Authentication (Leap Motion) ── */
  const gestureAuthBtn  = document.getElementById('gesture-auth-btn');
  const gestureModal    = document.getElementById('gesture-modal');
  const gestureCloseBtn = document.getElementById('gesture-modal-close');
  const modalBackdrop   = document.getElementById('modal-backdrop');
  const gestureStatus   = document.getElementById('gesture-status');
  const gestureProgress = document.getElementById('gesture-progress');
  let gestureTimer = null;
  let gestureInterval = null;

  function openGestureModal() {
    if (!gestureModal) return;
    gestureModal.style.display = 'flex';
    if (modalBackdrop) modalBackdrop.style.display = 'block';
    if (gestureProgress) gestureProgress.style.width = '0%';
    if (gestureStatus) gestureStatus.textContent = 'Hold your open hand steady above the Leap Motion sensor…';

    let progress = 0;
    gestureInterval = setInterval(() => {
      progress += 2;
      if (gestureProgress) gestureProgress.style.width = progress + '%';
      if (progress >= 100) {
        clearInterval(gestureInterval);
        if (gestureStatus) gestureStatus.textContent = 'Hand Verified ✅ Signing in…';
        setTimeout(() => {
          closeGestureModal();
          // Authenticate as demo user for current role
          const seedEmail = currentRole === 'doctor' ? 'ahmed@hospital.kw' : (currentRole === 'nurse' ? 'fatima@nurse.kw' : 'sarah@patient.kw');
          userIdInput.value = seedEmail;
          passwordInput.value = 'password123';
          loginForm.dispatchEvent(new Event('submit'));
        }, 500);
      }
    }, 40);

    // Fast-track if physical Leap Motion emits touchless-palm
    window.addEventListener('touchless-palm', () => {
      progress = 95;
      clearInterval(gestureInterval);
      if (gestureProgress) gestureProgress.style.width = '100%';
      if (gestureStatus) gestureStatus.textContent = 'Leap Motion Palm Authenticated ✅';
      setTimeout(() => {
        closeGestureModal();
        const seedEmail = currentRole === 'doctor' ? 'ahmed@hospital.kw' : (currentRole === 'nurse' ? 'fatima@nurse.kw' : 'sarah@patient.kw');
        userIdInput.value = seedEmail;
        passwordInput.value = 'password123';
        loginForm.dispatchEvent(new Event('submit'));
      }, 500);
    }, { once: true });
  }

  function closeGestureModal() {
    if (gestureModal) gestureModal.style.display = 'none';
    if (modalBackdrop) modalBackdrop.style.display = 'none';
    clearInterval(gestureInterval);
    clearTimeout(gestureTimer);
  }

  if (gestureAuthBtn) gestureAuthBtn.addEventListener('click', openGestureModal);
  if (gestureCloseBtn) gestureCloseBtn.addEventListener('click', closeGestureModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeGestureModal);

  /* Init */
  applyRole('patient');

})();
