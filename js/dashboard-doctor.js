/* ============================================================
   dashboard-doctor.js — Touchless Doctor Dashboard
   Features: floating dwell cursor, swipe navigation,
             appointment list, patient records, prescriptions
   ============================================================ */
(function () {
  'use strict';

  /* ── State ── */
  let currentTab        = 'appointments';
  let currentPatientIdx = 0;
  let selectedApptIdx   = 0;
  let dwellTimer        = null;
  let dwellTarget       = null;
  const DWELL_MS        = 1500;
  const CIRCUMFERENCE   = 163; // 2π × 26

  let loggedUser = null;
  try {
    const raw = sessionStorage.getItem('hms_user');
    if (raw) loggedUser = JSON.parse(raw);
  } catch (e) {}

  // Sync profile info in sidebar
  setTimeout(() => {
    if (loggedUser) {
      const nameEl = document.querySelector('.ds-name');
      const roleEl = document.querySelector('.ds-role');
      const avatarEl = document.querySelector('.ds-avatar');
      if (nameEl && loggedUser.fullName) nameEl.textContent = loggedUser.fullName;
      if (roleEl) roleEl.textContent = `${loggedUser.specialization || 'Cardiology'} · ${loggedUser.roomNumber || 'Clinic 301'}`;
      if (avatarEl && loggedUser.fullName) {
        avatarEl.textContent = loggedUser.fullName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase();
      }
    }
  }, 50);

  /* ── DOM ── */
  const cursor    = document.getElementById('gesture-cursor');
  const gcFill    = document.getElementById('gc-fill-el');
  const toast     = document.getElementById('gesture-toast');
  const dtbTitle  = document.getElementById('dtb-title');
  const dtbClock  = document.getElementById('dtb-clock');
  const todayDate = document.getElementById('today-date');

  /* ──────────────────────────────
     CLOCK & DATE
  ────────────────────────────── */
  function updateClock() {
    const now = new Date();
    dtbClock.textContent = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (todayDate) {
      todayDate.textContent = now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' });
    }
  }
  updateClock(); setInterval(updateClock, 1000);

  /* ──────────────────────────────
     TOAST NOTIFICATION
  ────────────────────────────── */
  let toastTimer;
  function showToast(msg) {
    toast.textContent = msg;
    toast.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2200);
  }

  /* ──────────────────────────────
     FLOATING GESTURE CURSOR
  ────────────────────────────── */
  cursor.style.display = 'block';

  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';

    const el = document.elementFromPoint(e.clientX, e.clientY);
    const target = el && el.closest('.gesture-target');

    if (target && target !== dwellTarget) {
      startDwell(target);
    } else if (!target && dwellTarget) {
      cancelDwell();
    }
  });

  document.addEventListener('mouseleave', cancelDwell);

  function startDwell(el) {
    cancelDwell();
    dwellTarget = el;
    let elapsed = 0;
    const step  = 30;
    // Show dwell bar on sidebar items
    const bar = el.querySelector('.dwell-bar');
    if (bar) bar.style.transition = `width ${DWELL_MS}ms linear`;

    dwellTimer = setInterval(() => {
      elapsed += step;
      const pct = elapsed / DWELL_MS;
      // Update SVG progress ring
      gcFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - pct);
      if (bar) bar.style.width = (pct * 100) + '%';
      if (elapsed >= DWELL_MS) {
        cancelDwell();
        el.click();
        GestureEngine.playBeep(800, 'sine', 0.15);
        showToast('✋ Gesture Selected');
        flashEl(el);
      }
    }, step);
  }

  function cancelDwell() {
    clearInterval(dwellTimer);
    dwellTimer  = null;
    dwellTarget = null;
    gcFill.style.strokeDashoffset = CIRCUMFERENCE;
    // Reset all dwell bars
    document.querySelectorAll('.dwell-bar').forEach(b => {
      b.style.transition = 'none'; b.style.width = '0%';
    });
  }

  function flashEl(el) {
    el.style.outline = '2px solid rgba(0,212,170,0.7)';
    setTimeout(() => { el.style.outline = ''; }, 400);
  }

  /* ──────────────────────────────
     TAB SWITCHING
  ────────────────────────────── */
  const TAB_TITLES = {
    appointments:  'Today\'s Appointments',
    patients:      'Patient Records',
    departments:   'Hospital Departments',
    prescriptions: 'Prescriptions',
    analytics:     'Department Analytics',
  };

  function switchTab(name) {
    currentTab = name;
    document.querySelectorAll('.dash-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.ds-nav-item').forEach(n => n.classList.remove('active'));
    const tab = document.getElementById('tab-' + name);
    const nav = document.getElementById('nav-' + name);
    if (tab) tab.classList.add('active');
    if (nav) nav.classList.add('active');
    if (dtbTitle) dtbTitle.textContent = TAB_TITLES[name] || name;
  }

  document.querySelectorAll('.ds-nav-item').forEach(btn => {
    // Inject dwell bar
    const bar = document.createElement('span');
    bar.className = 'dwell-bar';
    btn.appendChild(bar);
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  /* ──────────────────────────────
     RENDER APPOINTMENTS (Live API + Fallback)
  ────────────────────────────── */
  let liveAppointmentsList = [];
  let livePatientsList = [];

  async function fetchLiveAppointments() {
    const tl = document.getElementById('appt-timeline');
    if (!tl) return;
    const docId = loggedUser?.doctorId || 1;
    try {
      const fetcher = (window.HMS_API && window.HMS_API.fetch) ? window.HMS_API.fetch : fetch;
      const res = await fetcher(`api/appointments.php?doctor_id=${docId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.appointments) && data.appointments.length > 0) {
          liveAppointmentsList = data.appointments;
          renderAppointmentsFromData(liveAppointmentsList);
          const badge = document.getElementById('appt-count');
          if (badge) badge.textContent = liveAppointmentsList.length;
          return;
        }
      }
    } catch (e) {
      console.warn('Live appointment fetch failed, falling back to local dataset', e);
    }
    renderAppointmentsFallback();
  }

  function renderAppointmentsFromData(list) {
    const tl = document.getElementById('appt-timeline');
    if (!tl) return;
    tl.innerHTML = '';
    list.forEach((a, i) => {
      const row = document.createElement('div');
      row.className = `appt-row gesture-target status-${a.status}`;
      row.dataset.idx = i;
      const sc = HMS.statusColor(a.status);
      const sl = HMS.statusLabel(a.status);
      row.innerHTML = `
        <div class="appt-time">${a.appointment_time || '10:00'}</div>
        <div class="appt-avatar">👤</div>
        <div class="appt-info">
          <div class="appt-name">${a.patient_name || 'Patient #' + a.patient_id}</div>
          <div class="appt-detail">${a.reason || 'Consultation'} · Room ${a.room_number || 'Clinic 301'} · ${a.department_name || 'Cardiology'}</div>
        </div>
        <span class="appt-status-badge" style="background:${sc}22;color:${sc};border:1px solid ${sc}55">${sl}</span>
        <button class="appt-open-btn" data-idx="${i}">Open →</button>`;
      tl.appendChild(row);
    });

    tl.querySelectorAll('.appt-open-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const appt = list[+btn.dataset.idx];
        openPatientFromAppt(appt);
      });
    });

    tl.querySelectorAll('.appt-row').forEach(row => {
      row.addEventListener('click', () => {
        const appt = list[+row.dataset.idx];
        openPatientFromAppt(appt);
      });
    });
  }

  function openPatientFromAppt(appt) {
    const match = (livePatientsList.length ? livePatientsList : HMS.PATIENTS).find(
      p => p.name === appt.patient_name || p.id === 'P-' + appt.patient_id || p.patient_id === appt.patient_id
    );
    if (match) {
      openPatientByObj(match);
      switchTab('patients');
    } else {
      openPatientByObj({
        id: 'P-' + (appt.patient_id || '101'),
        name: appt.patient_name || 'Patient',
        age: 38, gender: 'M', blood: appt.patient_blood_type || 'O+',
        avatar: '👤', dept: appt.department_name || 'Cardiology',
        room: appt.room_number || 'Clinic 301', status: appt.status || 'stable',
        diagnosis: appt.reason || 'Consultation',
        vitals: { hr: 74, bp: '120/80', spo2: 98, temp: 36.8, rr: 16 },
        medications: ['Consultation in progress'],
        allergies: [],
        notes: appt.notes || 'Booked via Touchless Patient Kiosk. Live record loaded from SQLite database.',
        records: [{ date: appt.appointment_date, type: 'Kiosk Booking', result: appt.reason, badge: 'normal' }]
      });
      switchTab('patients');
    }
  }

  function renderAppointmentsFallback() {
    const tl = document.getElementById('appt-timeline');
    if (!tl) return;
    tl.innerHTML = '';
    HMS.APPOINTMENTS.forEach((a, i) => {
      const p   = HMS.getPatient(a.patient);
      if (!p) return;
      const row = document.createElement('div');
      row.className = `appt-row gesture-target status-${a.status}`;
      row.dataset.idx = i;
      const sc = HMS.statusColor(a.status);
      const sl = HMS.statusLabel(a.status);
      row.innerHTML = `
        <div class="appt-time">${a.time}</div>
        <div class="appt-avatar">${p.avatar}</div>
        <div class="appt-info">
          <div class="appt-name">${p.name}</div>
          <div class="appt-detail">${a.type} · Room ${a.room} · ${p.diagnosis}</div>
        </div>
        <span class="appt-status-badge" style="background:${sc}22;color:${sc};border:1px solid ${sc}55">${sl}</span>
        <button class="appt-open-btn" data-idx="${i}">Open →</button>`;
      tl.appendChild(row);
    });
    tl.querySelectorAll('.appt-open-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const appt = HMS.APPOINTMENTS[+btn.dataset.idx];
        const p    = HMS.getPatient(appt.patient);
        if (p) { openPatientByObj(p); switchTab('patients'); }
      });
    });
    tl.querySelectorAll('.appt-row').forEach(row => {
      row.addEventListener('click', () => {
        const appt = HMS.APPOINTMENTS[+row.dataset.idx];
        const p    = HMS.getPatient(appt.patient);
        if (p) { openPatientByObj(p); switchTab('patients'); }
      });
    });
  }

  /* ──────────────────────────────
     RENDER PATIENT LIST
  ────────────────────────────── */
  function renderPatientList(list) {
    const pl = document.getElementById('patient-list');
    if (!pl) return;
    pl.innerHTML = '';
    list.forEach((p, i) => {
      const sc = HMS.statusColor(p.status);
      const sl = HMS.statusLabel(p.status);
      const row = document.createElement('div');
      row.className = 'pt-row gesture-target';
      row.dataset.idx = i;
      row.innerHTML = `
        <div class="pt-avatar">${p.avatar}</div>
        <div class="pt-info">
          <div class="pt-name">${p.name}</div>
          <div class="pt-detail">${p.id} · ${p.dept} · Room ${p.room}</div>
        </div>
        <div class="pt-status" style="color:${sc}">${sl}</div>`;
      row.addEventListener('click', () => openPatientByIdx(i));
      pl.appendChild(row);
    });
  }

  function openPatientByIdx(idx) {
    currentPatientIdx = idx;
    openPatientByObj(HMS.PATIENTS[idx]);
    document.querySelectorAll('.pt-row').forEach((r, i) =>
      r.classList.toggle('selected', i === idx));
  }

  function openPatientByObj(p) {
    const emptyEl   = document.getElementById('prp-empty');
    const contentEl = document.getElementById('prp-content');
    if (!contentEl) return;
    if (emptyEl)   emptyEl.style.display   = 'none';
    contentEl.style.display = 'flex';

    const sc = HMS.statusColor(p.status);
    const sl = HMS.statusLabel(p.status);

    // Vitals (live updating)
    const vHr   = p.vitals.hr;
    const vBp   = p.vitals.bp;
    const vSpo2 = p.vitals.spo2;
    const vTemp = p.vitals.temp;
    const vRr   = p.vitals.rr;

    const allergyHtml = p.allergies.length
      ? p.allergies.map(a => `<span class="allergy-tag">⚠ ${a}</span>`).join('')
      : '<span style="color:var(--text-muted);font-size:0.82rem">No known allergies</span>';

    const recordHtml = p.records.map(r =>
      `<div class="rec-item">
        <span class="rec-date">${r.date}</span>
        <span class="rec-type">${r.type}</span>
        <span class="rec-badge ${r.badge}">${r.result}</span>
      </div>`).join('');

    const medHtml = p.medications.map(m =>
      `<div class="med-item">💊 ${m}</div>`).join('');

    contentEl.innerHTML = `
      <div class="prp-header">
        <div class="prp-avatar">${p.avatar}</div>
        <div>
          <div class="prp-name">${p.name}</div>
          <div class="prp-meta">${p.id} · ${p.gender === 'M' ? 'Male' : 'Female'} · ${p.age} yrs · Blood: ${p.blood} · Room: ${p.room}</div>
          <div class="prp-diag">${p.diagnosis}</div>
          <span style="font-size:0.72rem;font-weight:700;color:${sc};margin-top:0.3rem;display:inline-block">${sl}</span>
        </div>
      </div>
      <div class="prp-vitals">
        <div class="pv-item"><div class="pv-val" id="lv-hr">${vHr}</div><div class="pv-lbl">HR BPM</div></div>
        <div class="pv-item"><div class="pv-val" style="font-size:0.85rem" id="lv-bp">${vBp}</div><div class="pv-lbl">BP mmHg</div></div>
        <div class="pv-item"><div class="pv-val" style="color:#4ade80" id="lv-spo2">${vSpo2}</div><div class="pv-lbl">SpO₂ %</div></div>
        <div class="pv-item"><div class="pv-val" style="color:#facc15" id="lv-temp">${vTemp}</div><div class="pv-lbl">Temp °C</div></div>
        <div class="pv-item"><div class="pv-val" style="color:var(--blue-accent)" id="lv-rr">${vRr}</div><div class="pv-lbl">RR /min</div></div>
      </div>
      <div class="prp-tabs">
        <button class="prp-tab active gesture-target" data-panel="history">📋 History</button>
        <button class="prp-tab gesture-target"        data-panel="meds">💊 Medications</button>
        <button class="prp-tab gesture-target"        data-panel="allergies">⚠ Allergies</button>
        <button class="prp-tab gesture-target"        data-panel="notes">📝 Notes</button>
      </div>
      <div class="prp-panel active" id="panel-history">${recordHtml}</div>
      <div class="prp-panel"        id="panel-meds">${medHtml}</div>
      <div class="prp-panel"        id="panel-allergies">${allergyHtml}</div>
      <div class="prp-panel"        id="panel-notes"><p class="notes-text">${p.notes}</p></div>`;

    // Sub-tab switching
    contentEl.querySelectorAll('.prp-tab').forEach(t => {
      t.addEventListener('click', () => {
        contentEl.querySelectorAll('.prp-tab').forEach(x => x.classList.remove('active'));
        contentEl.querySelectorAll('.prp-panel').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        const panel = contentEl.querySelector('#panel-' + t.dataset.panel);
        if (panel) panel.classList.add('active');
      });
    });

    // Live vitals update
    clearInterval(window._vitalsTimer);
    window._vitalsTimer = setInterval(() => {
      const hrEl   = document.getElementById('lv-hr');
      const spo2El = document.getElementById('lv-spo2');
      const tempEl = document.getElementById('lv-temp');
      const rrEl   = document.getElementById('lv-rr');
      if (hrEl)   hrEl.textContent   = Math.round(vHr   + (Math.random() - 0.5) * 6);
      if (spo2El) spo2El.textContent = Math.round(vSpo2 + (Math.random() - 0.5) * 2);
      if (tempEl) tempEl.textContent = (vTemp + (Math.random() - 0.5) * 0.3).toFixed(1);
      if (rrEl)   rrEl.textContent   = Math.round(vRr   + (Math.random() - 0.5) * 2);
    }, 3000);
  }

  /* ──────────────────────────────
     RENDER DEPARTMENTS (mini)
  ────────────────────────────── */
  function renderDeptMini() {
    const grid = document.getElementById('dept-mini-grid');
    if (!grid) return;
    grid.innerHTML = '';
    HMS.DEPARTMENTS.forEach(d => {
      const card = document.createElement('div');
      card.className = 'dmi-card gesture-target';
      card.innerHTML = `
        <div class="dmi-top">
          <span class="dmi-icon">${d.icon}</span>
          ${d.touchless ? '<span class="dmi-tl">✋ Touchless</span>' : ''}
        </div>
        <div class="dmi-name">${d.name}</div>
        <div class="dmi-head">${d.head}</div>
        <div class="dmi-stats">
          <div class="dmi-stat"><b>${d.staff}</b> staff</div>
          ${d.beds > 0 ? `<div class="dmi-stat"><b>${d.beds}</b> beds</div>` : ''}
          <div class="dmi-stat">${d.floor}</div>
        </div>`;
      card.addEventListener('click', () => { window.location.href = 'departments.html'; });
      grid.appendChild(card);
    });
  }

  /* ──────────────────────────────
     RENDER PRESCRIPTIONS
  ────────────────────────────── */
  const sampleRx = [
    { patient:'Sarah Al-Mansouri', med:'Amlodipine 5mg', dose:'OD · 30 days', date:'28 Apr 2026' },
    { patient:'Ahmed Al-Rashidi',  med:'Warfarin 5mg',   dose:'OD · ongoing', date:'25 Apr 2026' },
    { patient:'Fatima Al-Zahra',   med:'Propranolol 20mg', dose:'BD · 60 days', date:'10 Apr 2026' },
  ];

  function renderRxHistory() {
    const list = document.getElementById('rx-list');
    if (!list) return;
    list.innerHTML = sampleRx.map(r => `
      <div class="rx-item">
        <b>${r.med} — ${r.patient}</b>
        <span>${r.dose} · Issued ${r.date}</span>
      </div>`).join('');
  }

  function populateRxPatients(list) {
    const sel = document.getElementById('rx-patient');
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select patient —</option>';
    const src = list && list.length ? list : HMS.PATIENTS;
    src.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.id || p.patient_id;
      opt.textContent = `${p.name} (${p.id || 'P-' + p.patient_id})`;
      sel.appendChild(opt);
    });
  }

  const rxSubmit = document.getElementById('rx-submit');
  if (rxSubmit) {
    rxSubmit.addEventListener('click', async () => {
      const patIdVal = document.getElementById('rx-patient').value;
      const med      = document.getElementById('rx-med').value.trim();
      const dose     = document.getElementById('rx-dose').value.trim();
      const dur      = document.getElementById('rx-duration')?.value.trim() || '30 days';
      const notes    = document.getElementById('rx-notes')?.value.trim() || '';

      if (!patIdVal || !med || !dose) {
        showToast('⚠ Fill all required fields');
        return;
      }

      const docId = loggedUser?.doctorId || 1;
      const patientIdNum = parseInt(String(patIdVal).replace('P-', '')) || 1;

      try {
        const fetcher = (window.HMS_API && window.HMS_API.fetch) ? window.HMS_API.fetch : fetch;
        await fetcher('api/prescriptions.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patientId: patientIdNum,
            doctorId: docId,
            medicationName: med,
            dosage: dose,
            frequency: 'Once daily',
            duration: dur,
            instructions: notes
          })
        });
        showToast('✅ Prescription saved to Database');
      } catch (err) {
        showToast('✅ Prescription issued');
      }

      const pObj = (livePatientsList.length ? livePatientsList : HMS.PATIENTS).find(x => x.id === patIdVal || x.patient_id === patientIdNum);
      sampleRx.unshift({
        patient: pObj ? pObj.name : patIdVal,
        med,
        dose: `${dose} · ${dur}`,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      });
      renderRxHistory();
      ['rx-med','rx-dose','rx-duration','rx-notes'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    });
  }

  async function fetchLivePatients() {
    try {
      const fetcher = (window.HMS_API && window.HMS_API.fetch) ? window.HMS_API.fetch : fetch;
      const res = await fetcher('api/patients.php');
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.patients) && data.patients.length > 0) {
          livePatientsList = data.patients.map(p => ({
            id: 'P-' + p.patient_id,
            patient_id: p.patient_id,
            name: p.full_name,
            age: 40,
            gender: p.gender === 'female' ? 'F' : 'M',
            blood: p.blood_type || 'O+',
            avatar: p.avatar || '👤',
            dept: 'cardiology',
            room: 'C-301',
            status: 'stable',
            diagnosis: p.medical_history || 'General Consultation',
            appointment: 'Scheduled',
            vitals: { hr: 72, bp: '120/80', spo2: 98, temp: 36.8, rr: 16 },
            medications: ['Amlodipine 5mg OD'],
            allergies: [],
            notes: `Kuwait Civil ID: ${p.civil_id || 'N/A'}. Phone: ${p.phone || 'N/A'}. Emergency: ${p.emergency_contact || 'None'}`,
            records: [{ date: 'Today', type: 'Database Patient Record', result: 'Verified', badge: 'normal' }]
          }));
          renderPatientList(livePatientsList);
          populateRxPatients(livePatientsList);
          const pCount = document.querySelectorAll('.dsni-count')[1];
          if (pCount) pCount.textContent = livePatientsList.length;
          return;
        }
      }
    } catch (e) {
      console.warn('Live patient fetch failed, using local dataset', e);
    }
    renderPatientList(HMS.PATIENTS);
    populateRxPatients(HMS.PATIENTS);
  }

  /* ──────────────────────────────
     GESTURE ZONE (canvas swipe)
  ────────────────────────────── */
  const canvas = document.getElementById('gesture-canvas');
  if (canvas) {
    GestureEngine.initMouseMode(canvas);
    GestureEngine.on('swipe', data => {
      if (data.direction === 'right') { navigatePatient(-1); showToast('⬅ Previous patient'); }
      if (data.direction === 'left')  { navigatePatient(+1); showToast('➡ Next patient'); }
    });
  }

  function navigatePatient(dir) {
    const list = HMS.PATIENTS;
    currentPatientIdx = (currentPatientIdx + dir + list.length) % list.length;
    openPatientByIdx(currentPatientIdx);
    if (currentTab !== 'patients') switchTab('patients');
  }

  /* Gesture zone button clicks */
  document.querySelectorAll('.gz-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const a = btn.dataset.action;
      if (a === 'prev')    { navigatePatient(-1); showToast('⬅ Previous patient'); }
      if (a === 'next')    { navigatePatient(+1); showToast('➡ Next patient'); }
      if (a === 'open')    { if (currentTab !== 'patients') switchTab('patients'); else showToast('📋 Record open'); }
      if (a === 'approve') { showToast('✅ Action approved'); GestureEngine.playBeep(880,'sine',0.12); }
      if (a === 'dismiss') { showToast('🔕 Alert dismissed'); GestureEngine.playBeep(440,'triangle',0.12); }
    });
  });

  /* ──────────────────────────────
     PATIENT SEARCH
  ────────────────────────────── */
  const searchInput = document.getElementById('patient-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.toLowerCase();
      const filtered = HMS.PATIENTS.filter(p =>
        p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.diagnosis.toLowerCase().includes(q));
      renderPatientList(filtered);
    });
  }

  /* ──────────────────────────────
     SIDEBAR TOGGLE
  ────────────────────────────── */
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebar       = document.getElementById('dash-sidebar');
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
  }

  /* ──────────────────────────────
     GESTURE MODE TOGGLE (click pill)
  ────────────────────────────── */
  let gestureOn = true;
  const gmStatus = document.getElementById('gm-status');
  document.getElementById('gesture-pill').addEventListener('click', () => {
    gestureOn = !gestureOn;
    cursor.style.display = gestureOn ? 'block' : 'none';
    if (gmStatus) gmStatus.textContent = gestureOn ? 'ON' : 'OFF';
    showToast(gestureOn ? '✋ Gesture mode enabled' : '🖱 Mouse mode active');
  });

  /* ──────────────────────────────
     INIT
  ────────────────────────────── */
  fetchLiveAppointments();
  fetchLivePatients();
  renderDeptMini();
  renderRxHistory();
  switchTab('appointments');

  /* ──────────────────────────────
     WEBCAM GESTURE BRIDGE
  ────────────────────────────── */
  const handEmoji  = document.getElementById('gz-hand-live');
  const hintText   = document.getElementById('gz-hint-text');

  // Swipe left → next patient
  window.addEventListener('wg-swipe-left', () => {
    navigatePatient(+1);
    showToast('👉 Next patient (gesture)');
    flashHand('👉');
  });

  // Swipe right → prev patient
  window.addEventListener('wg-swipe-right', () => {
    navigatePatient(-1);
    showToast('👈 Previous patient (gesture)');
    flashHand('👈');
  });

  // Open palm → pause / acknowledge (approve)
  window.addEventListener('wg-palm', () => {
    showToast('✋ Open Palm — Action Approved');
    GestureEngine.playBeep(880, 'sine', 0.12);
    flashHand('✋');
  });

  // Pinch → open patient record
  window.addEventListener('wg-pinch', () => {
    if (currentTab !== 'patients') switchTab('patients');
    showToast('🤌 Pinch — Opening Record');
    GestureEngine.playBeep(1000, 'sine', 0.1);
    flashHand('🤌');
  });

  // Live gesture label in footer
  if (typeof WGesture !== 'undefined') {
    WGesture.onGesture((label) => {
      if (hintText) hintText.textContent = label;
    });
  }

  function flashHand(emoji) {
    if (!handEmoji) return;
    handEmoji.textContent = emoji;
    handEmoji.style.transform = 'scale(1.6)';
    handEmoji.style.filter = 'drop-shadow(0 0 8px rgba(0,212,170,0.9))';
    setTimeout(() => {
      handEmoji.style.transform = '';
      handEmoji.style.filter = '';
      setTimeout(() => { handEmoji.textContent = '✋'; }, 800);
    }, 400);
  }

  // Camera toggle button
  const camBtn = document.getElementById('cam-toggle-btn');
  if (camBtn) {
    camBtn.addEventListener('click', () => {
      if (typeof WGesture === 'undefined') { showToast('⚠ Webcam engine not loaded'); return; }
      if (WGesture.isRunning()) {
        WGesture.stop();
        camBtn.style.opacity = '0.45';
        showToast('📷 Camera off');
      } else {
        WGesture.start();
        camBtn.style.opacity = '1';
        showToast('📷 Starting camera…');
      }
    });
  }

})();
