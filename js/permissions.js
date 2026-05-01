/* ============================================================
   TOUCHLESS HMS — Shared Permissions & Data Module
   Usage: include before any dashboard script
   ============================================================ */

const HMS = (() => {

  /* ── Permission Matrix ── */
  const PERMISSIONS = {
    patient:  { viewOwnRecords:true, bookAppointments:true, viewOwnVitals:true,
                viewOwnMedications:true, viewPatientList:false, writePrescriptions:false,
                acknowledgeAlarms:false, viewORInterface:false, touchlessGestures:false,
                viewDepartments:false, viewAnalytics:false, editRecords:false, manageSchedule:false },
    doctor:   { viewOwnRecords:false, bookAppointments:false, viewOwnVitals:false,
                viewPatientList:true, writePrescriptions:true, acknowledgeAlarms:true,
                viewORInterface:false, touchlessGestures:true, viewDepartments:true,
                viewAnalytics:true, editRecords:true, manageSchedule:true },
    nurse:    { viewOwnRecords:false, bookAppointments:false, viewOwnVitals:false,
                viewPatientList:true, writePrescriptions:false, acknowledgeAlarms:true,
                viewORInterface:true, touchlessGestures:true, viewDepartments:true,
                viewAnalytics:false, editRecords:false, manageSchedule:false },
    surgeon:  { viewOwnRecords:false, bookAppointments:false, viewOwnVitals:false,
                viewPatientList:true, writePrescriptions:true, acknowledgeAlarms:true,
                viewORInterface:true, touchlessGestures:true, viewDepartments:true,
                viewAnalytics:false, editRecords:true, manageSchedule:false },
  };

  /* ── Departments ── */
  const DEPARTMENTS = [
    { id:'emergency',   name:'Emergency Department',     abbr:'ED',    icon:'🚑', head:'Dr. Khaled Al-Mutairi',   staff:42, beds:30, floor:'Ground', zone:'semi-sterile', touchless:true,  desc:'Handles all acute medical emergencies 24/7. Triages and stabilizes critical patients.' },
    { id:'cardiology',  name:'Cardiology',               abbr:'CARD',  icon:'❤️', head:'Dr. Ahmed Al-Rashidi',    staff:18, beds:24, floor:'Floor 3', zone:'non-sterile',  touchless:true,  desc:'Diagnoses and treats diseases of the heart and vascular system. Catheter labs on-site.' },
    { id:'neurology',   name:'Neurology',                abbr:'NEURO', icon:'🧠', head:'Dr. Maryam Al-Dosari',   staff:14, beds:20, floor:'Floor 4', zone:'non-sterile',  touchless:false, desc:'Specializes in stroke, epilepsy, Parkinson\'s disease, and multiple sclerosis.' },
    { id:'orthopedics', name:'Orthopedics',              abbr:'ORTHO', icon:'🦴', head:'Dr. Faisal Al-Anezi',    staff:16, beds:22, floor:'Floor 2', zone:'sterile',      touchless:true,  desc:'Fractures, joint replacements, spine disorders, and sports injuries.' },
    { id:'oncology',    name:'Oncology',                 abbr:'ONC',   icon:'🎗️', head:'Dr. Hessa Al-Sabah',     staff:20, beds:28, floor:'Floor 5', zone:'sterile',      touchless:true,  desc:'Comprehensive cancer care: chemotherapy, radiation, immunotherapy, and palliative care.' },
    { id:'pediatrics',  name:'Pediatrics',               abbr:'PEDS',  icon:'👶', head:'Dr. Sara Hassan',        staff:22, beds:32, floor:'Floor 2', zone:'non-sterile',  touchless:false, desc:'Medical care for infants, children, and adolescents. Neonatology and pediatric ICU.' },
    { id:'radiology',   name:'Radiology & Imaging',      abbr:'RAD',   icon:'🔬', head:'Dr. Yousif Al-Kandari', staff:12, beds:0,  floor:'Floor 1', zone:'non-sterile',  touchless:true,  desc:'CT, MRI, X-Ray, PET, and ultrasound imaging. Interventional radiology procedures.' },
    { id:'icu',         name:'ICU / Critical Care',      abbr:'ICU',   icon:'💓', head:'Dr. Waleed Al-Shammari',staff:35, beds:16, floor:'Floor 3', zone:'sterile',      touchless:true,  desc:'Intensive monitoring and life support for critically ill patients.' },
    { id:'surgery',     name:'General Surgery / OR',     abbr:'OR',    icon:'⚕️', head:'Dr. Khalid Al-Mutairi', staff:28, beds:12, floor:'Floor 3', zone:'sterile',      touchless:true,  desc:'Five ORs supporting laparoscopic, robotic, and open surgeries. Leap Motion active.' },
    { id:'outpatient',  name:'Outpatient Clinics',       abbr:'OPD',   icon:'🏢', head:'Admin: Noura Al-Rashidi',staff:30,beds:0,  floor:'Floor 1', zone:'non-sterile',  touchless:false, desc:'Scheduled consultations, follow-up visits, and preventive care. 200+ patients daily.' },
    { id:'laboratory',  name:'Clinical Laboratory',      abbr:'LAB',   icon:'🧪', head:'Dr. Reem Al-Zahra',     staff:18, beds:0,  floor:'Floor 1', zone:'semi-sterile', touchless:false, desc:'Hematology, biochemistry, microbiology, pathology, and blood banking.' },
    { id:'pharmacy',    name:'Pharmacy',                 abbr:'PHARM', icon:'💊', head:'Pharm. Ali Al-Mutawa',  staff:10, beds:0,  floor:'Ground',  zone:'non-sterile',  touchless:false, desc:'Inpatient and outpatient pharmacy. Clinical review of all prescriptions. 24hr service.' },
  ];

  /* ── Sample Patients ── */
  const PATIENTS = [
    { id:'P-2841', name:'Sarah Al-Mansouri', age:42, gender:'F', blood:'O+', avatar:'SA',
      dept:'cardiology', room:'C-304', status:'stable',
      diagnosis:'Hypertensive Heart Disease', appointment:'10:00 AM · Follow-up',
      vitals:{ hr:74, bp:'120/80', spo2:98, temp:36.8, rr:16 },
      medications:['Amlodipine 5mg OD','Metoprolol 25mg BD','Aspirin 81mg OD'],
      allergies:['Penicillin','Sulfa drugs'],
      notes:'Patient doing well on current regimen. Monitor BP closely. Next follow-up in 4 weeks.',
      records:[
        { date:'12 Apr 2026', type:'Blood Panel',             result:'Normal',          badge:'normal' },
        { date:'28 Mar 2026', type:'Cardiology Consultation', result:'Reviewed',         badge:'normal' },
        { date:'10 Feb 2026', type:'Chest X-Ray',             result:'Mild findings',    badge:'attention' },
        { date:'15 Jan 2026', type:'ECG',                     result:'Normal sinus rhythm',badge:'normal' },
      ]},
    { id:'P-1632', name:'Ahmed Al-Rashidi',  age:57, gender:'M', blood:'A-', avatar:'AR',
      dept:'cardiology', room:'C-308', status:'monitoring',
      diagnosis:'Coronary Artery Disease', appointment:'11:30 AM · Post-CABG Review',
      vitals:{ hr:68, bp:'130/85', spo2:96, temp:37.1, rr:18 },
      medications:['Warfarin 5mg OD','Atorvastatin 40mg ON','Carvedilol 6.25mg BD'],
      allergies:['Codeine'],
      notes:'Post-CABG day 6. Wound healing well. Continue current anticoagulation protocol.',
      records:[
        { date:'29 Apr 2026', type:'Post-Op Assessment',  result:'Stable',        badge:'normal' },
        { date:'25 Apr 2026', type:'CABG Surgery',        result:'Successful',    badge:'normal' },
        { date:'20 Apr 2026', type:'Coronary Angiography',result:'3-vessel CAD',  badge:'attention' },
      ]},
    { id:'P-3019', name:'Fatima Al-Zahra',   age:35, gender:'F', blood:'B+', avatar:'FZ',
      dept:'cardiology', room:'C-302', status:'stable',
      diagnosis:'Mitral Valve Prolapse', appointment:'1:00 PM · Lab Review',
      vitals:{ hr:80, bp:'110/70', spo2:99, temp:36.5, rr:14 },
      medications:['Propranolol 20mg BD','Magnesium 250mg OD'],
      allergies:[],
      notes:'Reassurance given. Continue beta-blocker for symptomatic PVCs. Annual echo monitoring.',
      records:[
        { date:'10 Apr 2026', type:'Echocardiogram',  result:'Mild MVP confirmed', badge:'attention' },
        { date:'02 Apr 2026', type:'Holter Monitor',  result:'24h: PVCs noted',   badge:'attention' },
        { date:'15 Mar 2026', type:'Blood Panel',     result:'Normal',             badge:'normal' },
      ]},
    { id:'P-0774', name:'Khalid Al-Mutairi', age:65, gender:'M', blood:'AB+', avatar:'KM',
      dept:'icu', room:'ICU-2', status:'critical',
      diagnosis:'Acute MI + Cardiogenic Shock', appointment:'2:30 PM · Emergency Consult',
      vitals:{ hr:102, bp:'88/60', spo2:91, temp:37.9, rr:24 },
      medications:['Dopamine 5mcg/kg/min IV','Aspirin 300mg STAT','Heparin infusion'],
      allergies:['NSAIDs'],
      notes:'CRITICAL. Hemodynamically unstable. Cardiology-ICU co-management. IABP in situ.',
      records:[
        { date:'30 Apr 2026', type:'Troponin I',        result:'Elevated x8',      badge:'attention' },
        { date:'30 Apr 2026', type:'Emergency PCI',     result:'LAD stented',      badge:'attention' },
        { date:'29 Apr 2026', type:'Chest X-Ray',       result:'Pulmonary edema',  badge:'attention' },
      ]},
    { id:'P-4201', name:'Nora Al-Sabah',     age:29, gender:'F', blood:'O-', avatar:'NS',
      dept:'cardiology', room:'C-306', status:'stable',
      diagnosis:'Supraventricular Tachycardia', appointment:'3:30 PM · Consultation',
      vitals:{ hr:88, bp:'118/75', spo2:99, temp:36.6, rr:15 },
      medications:['Verapamil 80mg TDS'],
      allergies:[],
      notes:'SVT well-controlled. Discuss catheter ablation as definitive treatment option.',
      records:[
        { date:'22 Apr 2026', type:'EP Study',        result:'SVT confirmed',    badge:'attention' },
        { date:'15 Apr 2026', type:'ECG',             result:'SVT episode',      badge:'attention' },
        { date:'01 Apr 2026', type:'Echo',            result:'Normal function',  badge:'normal' },
      ]},
  ];

  /* ── Today's Appointments Schedule ── */
  const APPOINTMENTS = [
    { time:'08:30', patient:'P-2841', type:'Follow-up',        room:'C-304', status:'completed' },
    { time:'10:00', patient:'P-2841', type:'Follow-up',        room:'C-304', status:'in-progress' },
    { time:'11:30', patient:'P-1632', type:'Post-Op Review',   room:'C-308', status:'waiting' },
    { time:'13:00', patient:'P-3019', type:'Lab Review',       room:'C-302', status:'scheduled' },
    { time:'14:30', patient:'P-0774', type:'Emergency Consult',room:'ICU-2', status:'scheduled' },
    { time:'15:30', patient:'P-4201', type:'Consultation',     room:'C-306', status:'scheduled' },
  ];

  /* ── Helpers ── */
  function can(role, action) {
    return !!(PERMISSIONS[role] && PERMISSIONS[role][action]);
  }

  function getRole() {
    const params = new URLSearchParams(window.location.search);
    return params.get('role') || sessionStorage.getItem('hms_role') || 'patient';
  }

  function getPatient(id) {
    return PATIENTS.find(p => p.id === id) || null;
  }

  function statusColor(s) {
    return { stable:'#4ade80', monitoring:'#facc15', critical:'#ef4444', waiting:'#facc15',
             scheduled:'#94a3b8', 'in-progress':'#00d4aa', completed:'#475569' }[s] || '#94a3b8';
  }

  function statusLabel(s) {
    return { stable:'🟢 Stable', monitoring:'🟡 Monitoring', critical:'🔴 Critical',
             waiting:'⏳ Waiting', scheduled:'📋 Scheduled', 'in-progress':'🟢 In Room',
             completed:'✅ Done' }[s] || s;
  }

  return { PERMISSIONS, DEPARTMENTS, PATIENTS, APPOINTMENTS, can, getRole, getPatient, statusColor, statusLabel };
})();
