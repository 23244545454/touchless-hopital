// =====================================================================
// server.js — Full-Stack Backend Server & REST API for Touchless HMS
// Node.js HTTP Server with SQLite Database Integration & Static Hosting
// =====================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const db = require('./database/db.js');

const PORT = 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff'
};

// Helper: send JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
}

// Helper: parse JSON request body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
      if (body.length > 1e6) { // 1MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------
// REST API ROUTER
// ---------------------------------------------------------------------
async function handleApiRequest(req, res, parsedUrl) {
  const method = req.method.toUpperCase();
  const pathname = parsedUrl.pathname;
  const query = parsedUrl.query;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    });
    return res.end();
  }

  try {
    // -----------------------------------------------------------------
    // AUTH: REGISTER
    // POST /api/auth/register
    // -----------------------------------------------------------------
    if (pathname === '/api/auth/register' && method === 'POST') {
      const data = await parseBody(req);
      const { fullName, email, password, phone, civilId, dob, gender, bloodType, emergencyContact } = data;

      if (!fullName || !email || !password) {
        return sendJson(res, 400, { error: 'Full name, email, and password are required' });
      }

      // Check if email already exists
      const existing = db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
      if (existing) {
        return sendJson(res, 409, { error: 'An account with this email already exists' });
      }

      // Create user
      db.run(
        `INSERT INTO users (full_name, email, password_hash, role, phone, avatar) 
         VALUES (?, ?, ?, 'patient', ?, '👤')`,
        [fullName.trim(), email.toLowerCase().trim(), password, phone || null]
      );
      const newUser = db.get('SELECT id, full_name, email, role, phone, avatar FROM users WHERE email = ?', [email.toLowerCase().trim()]);

      // Create patient profile
      db.run(
        `INSERT INTO patients (user_id, civil_id, date_of_birth, gender, blood_type, emergency_contact)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [newUser.id, civilId || null, dob || null, gender || 'other', bloodType || 'O+', emergencyContact || null]
      );
      const patient = db.get('SELECT id FROM patients WHERE user_id = ?', [newUser.id]);

      return sendJson(res, 201, {
        success: true,
        message: 'Account registered successfully',
        user: { ...newUser, patientId: patient.id }
      });
    }

    // -----------------------------------------------------------------
    // AUTH: LOGIN
    // POST /api/auth/login
    // -----------------------------------------------------------------
    if (pathname === '/api/auth/login' && method === 'POST') {
      const data = await parseBody(req);
      const { email, password } = data;

      if (!email || !password) {
        return sendJson(res, 400, { error: 'Email and password are required' });
      }

      const user = db.get(
        'SELECT id, full_name, email, password_hash, role, phone, avatar FROM users WHERE LOWER(email) = ?',
        [email.toLowerCase().trim()]
      );

      if (!user || user.password_hash !== password) {
        return sendJson(res, 401, { error: 'Invalid email or password' });
      }

      let extra = {};
      if (user.role === 'patient') {
        const p = db.get('SELECT id as patient_id, blood_type, civil_id FROM patients WHERE user_id = ?', [user.id]);
        if (p) extra = { patientId: p.patient_id, bloodType: p.blood_type, civilId: p.civil_id };
      } else if (user.role === 'doctor') {
        const d = db.get('SELECT id as doctor_id, specialization, room_number FROM doctors WHERE user_id = ?', [user.id]);
        if (d) extra = { doctorId: d.doctor_id, specialization: d.specialization, roomNumber: d.room_number };
      }

      return sendJson(res, 200, {
        success: true,
        user: {
          id: user.id,
          fullName: user.full_name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          avatar: user.avatar,
          ...extra
        }
      });
    }

    // -----------------------------------------------------------------
    // DEPARTMENTS: LIST
    // GET /api/departments
    // -----------------------------------------------------------------
    if (pathname === '/api/departments' && method === 'GET') {
      const departments = db.all(`
        SELECT d.id, d.name, d.floor, d.description, d.icon,
               COUNT(doc.id) as doctor_count
        FROM departments d
        LEFT JOIN doctors doc ON d.id = doc.department_id
        GROUP BY d.id
        ORDER BY d.id ASC
      `);
      return sendJson(res, 200, { success: true, departments });
    }

    // -----------------------------------------------------------------
    // DOCTORS: LIST & SEARCH
    // GET /api/doctors
    // -----------------------------------------------------------------
    if (pathname === '/api/doctors' && method === 'GET') {
      let sql = `
        SELECT doc.id, doc.user_id, doc.department_id, doc.specialization, doc.room_number,
               doc.bio, doc.available_days, doc.consultation_fee, doc.rating,
               u.full_name, u.email, u.phone, u.avatar,
               dep.name as department_name, dep.floor as department_floor, dep.icon as department_icon
        FROM doctors doc
        JOIN users u ON doc.user_id = u.id
        JOIN departments dep ON doc.department_id = dep.id
        WHERE 1=1
      `;
      const params = [];

      if (query.department_id) {
        sql += ' AND doc.department_id = ?';
        params.push(parseInt(query.department_id));
      }

      if (query.search) {
        const term = `%${query.search.toLowerCase().trim()}%`;
        sql += ' AND (LOWER(u.full_name) LIKE ? OR LOWER(doc.specialization) LIKE ? OR LOWER(dep.name) LIKE ?)';
        params.push(term, term, term);
      }

      sql += ' ORDER BY doc.id ASC';
      const doctors = db.all(sql, params);
      return sendJson(res, 200, { success: true, doctors });
    }

    // -----------------------------------------------------------------
    // DOCTORS: GET SINGLE
    // GET /api/doctors/:id
    // -----------------------------------------------------------------
    const docMatch = pathname.match(/^\/api\/doctors\/(\d+)$/);
    if (docMatch && method === 'GET') {
      const docId = parseInt(docMatch[1]);
      const doctor = db.get(`
        SELECT doc.id, doc.user_id, doc.department_id, doc.specialization, doc.room_number,
               doc.bio, doc.available_days, doc.consultation_fee, doc.rating,
               u.full_name, u.email, u.phone, u.avatar,
               dep.name as department_name, dep.floor as department_floor, dep.icon as department_icon
        FROM doctors doc
        JOIN users u ON doc.user_id = u.id
        JOIN departments dep ON doc.department_id = dep.id
        WHERE doc.id = ?
      `, [docId]);

      if (!doctor) return sendJson(res, 404, { error: 'Doctor not found' });
      return sendJson(res, 200, { success: true, doctor });
    }

    // -----------------------------------------------------------------
    // APPOINTMENTS: LIST
    // GET /api/appointments
    // -----------------------------------------------------------------
    if (pathname === '/api/appointments' && method === 'GET') {
      let sql = `
        SELECT a.id, a.patient_id, a.doctor_id, a.department_id,
               a.appointment_date, a.appointment_time, a.status, a.reason, a.notes, a.created_at,
               pu.full_name as patient_name, pu.email as patient_email, pu.phone as patient_phone,
               pt.civil_id as patient_civil_id, pt.blood_type as patient_blood_type,
               du.full_name as doctor_name, doc.specialization as doctor_specialization, doc.room_number,
               dep.name as department_name, dep.floor as department_floor, dep.icon as department_icon
        FROM appointments a
        JOIN patients pt ON a.patient_id = pt.id
        JOIN users pu ON pt.user_id = pu.id
        JOIN doctors doc ON a.doctor_id = doc.id
        JOIN users du ON doc.user_id = du.id
        JOIN departments dep ON a.department_id = dep.id
        WHERE 1=1
      `;
      const params = [];

      if (query.patient_id) {
        sql += ' AND a.patient_id = ?';
        params.push(parseInt(query.patient_id));
      }
      if (query.doctor_id) {
        sql += ' AND a.doctor_id = ?';
        params.push(parseInt(query.doctor_id));
      }
      if (query.date) {
        sql += ' AND a.appointment_date = ?';
        params.push(query.date);
      }

      sql += ' ORDER BY a.appointment_date DESC, a.appointment_time ASC';
      const appointments = db.all(sql, params);
      return sendJson(res, 200, { success: true, appointments });
    }

    // -----------------------------------------------------------------
    // APPOINTMENTS: CREATE
    // POST /api/appointments
    // -----------------------------------------------------------------
    if (pathname === '/api/appointments' && method === 'POST') {
      const data = await parseBody(req);
      const { patientId, doctorId, departmentId, appointmentDate, appointmentTime, reason, notes } = data;

      if (!patientId || !doctorId || !appointmentDate || !appointmentTime || !reason) {
        return sendJson(res, 400, { error: 'patientId, doctorId, appointmentDate, appointmentTime, and reason are required' });
      }

      // Auto-lookup department if not explicitly given
      let deptId = departmentId;
      if (!deptId) {
        const doc = db.get('SELECT department_id FROM doctors WHERE id = ?', [doctorId]);
        if (!doc) return sendJson(res, 404, { error: 'Doctor not found' });
        deptId = doc.department_id;
      }

      // Insert appointment
      db.run(`
        INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, notes)
        VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)
      `, [patientId, doctorId, deptId, appointmentDate, appointmentTime, reason, notes || null]);

      const inserted = db.get('SELECT * FROM appointments ORDER BY id DESC LIMIT 1');

      return sendJson(res, 201, {
        success: true,
        message: 'Appointment booked successfully',
        appointment: inserted
      });
    }

    // -----------------------------------------------------------------
    // APPOINTMENTS: UPDATE STATUS
    // PATCH /api/appointments/:id
    // -----------------------------------------------------------------
    const apptMatch = pathname.match(/^\/api\/appointments\/(\d+)$/);
    if (apptMatch && method === 'PATCH') {
      const apptId = parseInt(apptMatch[1]);
      const data = await parseBody(req);
      const { status, notes } = data;

      const appt = db.get('SELECT id FROM appointments WHERE id = ?', [apptId]);
      if (!appt) return sendJson(res, 404, { error: 'Appointment not found' });

      if (status) {
        db.run('UPDATE appointments SET status = ? WHERE id = ?', [status, apptId]);
      }
      if (notes !== undefined) {
        db.run('UPDATE appointments SET notes = ? WHERE id = ?', [notes, apptId]);
      }

      const updated = db.get('SELECT * FROM appointments WHERE id = ?', [apptId]);
      return sendJson(res, 200, { success: true, appointment: updated });
    }

    // -----------------------------------------------------------------
    // PRESCRIPTIONS: LIST & CREATE
    // GET / POST /api/prescriptions
    // -----------------------------------------------------------------
    if (pathname === '/api/prescriptions') {
      if (method === 'GET') {
        let sql = `
          SELECT pr.id, pr.appointment_id, pr.patient_id, pr.doctor_id,
                 pr.medication_name, pr.dosage, pr.frequency, pr.duration, pr.instructions, pr.created_at,
                 du.full_name as doctor_name, doc.specialization as doctor_specialization,
                 pu.full_name as patient_name
          FROM prescriptions pr
          JOIN patients pt ON pr.patient_id = pt.id
          JOIN users pu ON pt.user_id = pu.id
          JOIN doctors doc ON pr.doctor_id = doc.id
          JOIN users du ON doc.user_id = du.id
          WHERE 1=1
        `;
        const params = [];
        if (query.patient_id) { sql += ' AND pr.patient_id = ?'; params.push(parseInt(query.patient_id)); }
        if (query.doctor_id)  { sql += ' AND pr.doctor_id = ?';  params.push(parseInt(query.doctor_id)); }
        sql += ' ORDER BY pr.created_at DESC';

        const prescriptions = db.all(sql, params);
        return sendJson(res, 200, { success: true, prescriptions });
      }

      if (method === 'POST') {
        const data = await parseBody(req);
        const { appointmentId, patientId, doctorId, medicationName, dosage, frequency, duration, instructions } = data;
        if (!patientId || !doctorId || !medicationName || !dosage) {
          return sendJson(res, 400, { error: 'patientId, doctorId, medicationName, and dosage are required' });
        }
        db.run(`
          INSERT INTO prescriptions (appointment_id, patient_id, doctor_id, medication_name, dosage, frequency, duration, instructions)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [appointmentId || null, patientId, doctorId, medicationName, dosage, frequency || 'Once daily', duration || '30 days', instructions || null]);

        const inserted = db.get('SELECT * FROM prescriptions ORDER BY id DESC LIMIT 1');
        return sendJson(res, 201, { success: true, prescription: inserted });
      }
    }

    // -----------------------------------------------------------------
    // VITALS: LIST & RECORD
    // GET / POST /api/vitals
    // -----------------------------------------------------------------
    if (pathname === '/api/vitals') {
      if (method === 'GET') {
        const patientId = query.patient_id ? parseInt(query.patient_id) : 1;
        const vitals = db.all(`
          SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 20
        `, [patientId]);
        return sendJson(res, 200, { success: true, vitals });
      }

      if (method === 'POST') {
        const data = await parseBody(req);
        const { patientId, heartRate, bloodPressure, spo2, temperature } = data;
        if (!patientId) return sendJson(res, 400, { error: 'patientId is required' });

        db.run(`
          INSERT INTO vitals (patient_id, heart_rate, blood_pressure, spo2, temperature)
          VALUES (?, ?, ?, ?, ?)
        `, [patientId, heartRate || 72, bloodPressure || '120/80', spo2 || 98, temperature || 36.8]);

        const inserted = db.get('SELECT * FROM vitals ORDER BY id DESC LIMIT 1');
        return sendJson(res, 201, { success: true, vital: inserted });
      }
    }

    // -----------------------------------------------------------------
    // PATIENTS: LIST
    // GET /api/patients
    // -----------------------------------------------------------------
    if (pathname === '/api/patients' && method === 'GET') {
      const patients = db.all(`
        SELECT p.id as patient_id, u.id as user_id, u.full_name, u.email, u.phone, u.avatar,
               p.civil_id, p.date_of_birth, p.gender, p.blood_type, p.emergency_contact, p.medical_history
        FROM patients p
        JOIN users u ON p.user_id = u.id
        ORDER BY p.id ASC
      `);
      return sendJson(res, 200, { success: true, patients });
    }

    // Unmatched API endpoint
    return sendJson(res, 404, { error: `API route not found: ${method} ${pathname}` });

  } catch (err) {
    console.error(`[API Error] ${method} ${pathname}:`, err);
    return sendJson(res, 500, { error: 'Internal server error', details: err.message });
  }
}

// ---------------------------------------------------------------------
// HTTP SERVER (API + STATIC ASSETS)
// ---------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);

  // If request begins with /api/, route to REST API
  if (parsedUrl.pathname.startsWith('/api/')) {
    return handleApiRequest(req, res, parsedUrl);
  }

  // Otherwise, serve static files
  let reqPath = decodeURI(parsedUrl.pathname);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(ROOT, reqPath);

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`<h1>404 Not Found</h1><p>Resource not found: ${reqPath}</p>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`\n======================================================`);
  console.log(`🏥 Touchless Hospital Management System (Touchless HMS)`);
  console.log(`📡 Local Web App: http://localhost:${PORT}`);
  console.log(`⚡ REST API Ready: http://localhost:${PORT}/api/`);
  console.log(`🗄️ SQL Database: ${db.DB_PATH}`);
  console.log(`🖐️ Leap Motion WS: ws://127.0.0.1:6437/v6.json`);
  console.log(`======================================================\n`);
});
