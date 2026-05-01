/* dashboard-nurse.js — Nurse Station Logic */
(function () {
  'use strict';

  const CIRCUMFERENCE = 163;
  const DWELL_MS = 1500;
  let dwellTimer = null, dwellTarget = null;
  let selectedBedIdx = 0;

  /* ── Clock ── */
  setInterval(() => {
    const c = document.getElementById('ntb-clock');
    if (c) c.textContent = new Date().toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
  }, 1000);

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
    dwellTimer = setInterval(() => {
      elapsed += 30;
      if (gcFill) gcFill.style.strokeDashoffset = CIRCUMFERENCE * (1 - elapsed / DWELL_MS);
      if (elapsed >= DWELL_MS) { cancelDwell(); el.click(); GestureEngine.playBeep(800,'sine',0.12); }
    }, 30);
  }
  function cancelDwell() {
    clearInterval(dwellTimer); dwellTimer = null; dwellTarget = null;
    if (gcFill) gcFill.style.strokeDashoffset = CIRCUMFERENCE;
  }

  /* ── Alarm Dismiss ── */
  document.querySelectorAll('.ai-dismiss').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = document.getElementById(btn.dataset.alarm);
      if (row) row.classList.add('dismissed');
      showToast('🔕 Alarm dismissed');
    });
  });

  /* ── Bed Map ── */
  const beds = [
    { num:'C-301', name:'Al-Zahra',    status:'stable',     patient:'P-3019' },
    { num:'C-302', name:'Empty',       status:'empty',      patient:null },
    { num:'C-303', name:'Al-Mansouri', status:'stable',     patient:'P-2841' },
    { num:'C-304', name:'Empty',       status:'empty',      patient:null },
    { num:'C-305', name:'Al-Rashidi',  status:'monitoring', patient:'P-1632' },
    { num:'C-306', name:'Al-Sabah',    status:'stable',     patient:'P-4201' },
    { num:'C-307', name:'Empty',       status:'empty',      patient:null },
    { num:'C-308', name:'Empty',       status:'empty',      patient:null },
    { num:'ICU-1', name:'Empty',       status:'empty',      patient:null },
    { num:'ICU-2', name:'Al-Mutairi',  status:'critical',   patient:'P-0774' },
    { num:'ICU-3', name:'Empty',       status:'empty',      patient:null },
    { num:'ICU-4', name:'Empty',       status:'empty',      patient:null },
  ];

  const bedIcons = { stable:'🟢', monitoring:'🟡', critical:'🔴', empty:'⬜' };

  function renderBedMap() {
    const map = document.getElementById('bed-map');
    if (!map) return;
    map.innerHTML = '';
    beds.forEach((b, i) => {
      const cell = document.createElement('div');
      cell.className = `bed-cell ${b.status}`;
      if (b.status !== 'empty') cell.classList.add('gesture-target');
      cell.innerHTML = `<div class="bc-num">${b.num}</div><div class="bc-icon">${bedIcons[b.status]}</div><div class="bc-name">${b.name}</div>`;
      cell.addEventListener('click', () => { if (b.patient) { selectedBedIdx = i; loadVitals(b.patient); } });
      map.appendChild(cell);
    });
  }

  function loadVitals(pid) {
    const p = HMS.getPatient(pid);
    if (!p) return;
    document.getElementById('vm-patient-name').textContent = p.name + ' — ' + p.room;
    const update = () => {
      const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      set('vn-hr',   Math.round(p.vitals.hr   + (Math.random()-0.5)*6));
      set('vn-bp',   p.vitals.bp);
      set('vn-spo2', Math.round(p.vitals.spo2 + (Math.random()-0.5)*2));
      set('vn-temp', (p.vitals.temp + (Math.random()-0.5)*0.2).toFixed(1));
    };
    update(); clearInterval(window._vitT); window._vitT = setInterval(update, 3000);
  }

  /* ── Patient List ── */
  function renderNursePatients() {
    const list = document.getElementById('np-list');
    if (!list) return;
    list.innerHTML = '';
    HMS.PATIENTS.forEach((p, i) => {
      const sc = HMS.statusColor(p.status);
      const sl = HMS.statusLabel(p.status);
      const row = document.createElement('div');
      row.className = 'np-row gesture-target';
      row.innerHTML = `
        <div class="np-av">${p.avatar}</div>
        <div class="np-name">${p.name}</div>
        <div class="np-room">${p.room}</div>
        <div class="np-st" style="color:${sc}">${sl}</div>`;
      row.addEventListener('click', () => loadVitals(p.id));
      list.appendChild(row);
    });
  }

  /* ── Gesture Canvas ── */
  const canvas = document.getElementById('gesture-canvas');
  if (canvas) {
    GestureEngine.initMouseMode(canvas);
    GestureEngine.on('swipe', d => {
      if (d.direction === 'right') { selectedBedIdx = Math.max(0, selectedBedIdx - 1); showToast('⬅ Prev patient'); }
      if (d.direction === 'left')  { selectedBedIdx = Math.min(beds.length-1, selectedBedIdx + 1); showToast('➡ Next patient'); }
      const b = beds[selectedBedIdx];
      if (b && b.patient) loadVitals(b.patient);
    });
  }

  /* ── Gesture Buttons ── */
  document.getElementById('gz-dismiss-all').addEventListener('click', () => {
    document.querySelectorAll('.alarm-item').forEach(a => a.classList.add('dismissed'));
    showToast('🔕 All alarms dismissed');
  });
  document.getElementById('gz-prev-pt').addEventListener('click', () => {
    selectedBedIdx = Math.max(0, selectedBedIdx - 1);
    const b = beds[selectedBedIdx]; if (b && b.patient) loadVitals(b.patient);
    showToast('⬅ Prev patient');
  });
  document.getElementById('gz-next-pt').addEventListener('click', () => {
    selectedBedIdx = Math.min(beds.length-1, selectedBedIdx + 1);
    const b = beds[selectedBedIdx]; if (b && b.patient) loadVitals(b.patient);
    showToast('➡ Next patient');
  });
  document.getElementById('gz-acknowledge').addEventListener('click', () => {
    showToast('✅ Acknowledged'); GestureEngine.playBeep(880,'sine',0.12);
  });

  /* ── Init ── */
  renderBedMap();
  renderNursePatients();
  loadVitals('P-2841');
})();
