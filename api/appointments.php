<?php
// =====================================================================
// api/appointments.php — Appointments Management API (GET, POST, PATCH)
// Full Foreign Key Integrity: patient_id, doctor_id, department_id
// =====================================================================

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

// ---------------------------------------------------------------------
// 1. GET APPOINTMENTS (Filtered by patient_id or doctor_id)
// ---------------------------------------------------------------------
if ($method === 'GET') {
    $patientId = isset($_GET['patient_id']) ? (int)$_GET['patient_id'] : 0;
    $doctorId  = isset($_GET['doctor_id'])  ? (int)$_GET['doctor_id']  : 0;

    $sql = '
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
    ';
    $params = [];

    if ($patientId > 0) {
        $sql .= ' AND a.patient_id = ?';
        $params[] = $patientId;
    }
    if ($doctorId > 0) {
        $sql .= ' AND a.doctor_id = ?';
        $params[] = $doctorId;
    }

    $sql .= ' ORDER BY a.appointment_date DESC, a.appointment_time ASC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $appointments = $stmt->fetchAll();

    sendResponse(200, [
        'success'      => true,
        'backend'      => 'PHP ' . PHP_VERSION,
        'appointments' => $appointments
    ]);
}

// ---------------------------------------------------------------------
// 2. CREATE APPOINTMENT (POST)
// ---------------------------------------------------------------------
if ($method === 'POST') {
    $data = getJsonBody();
    $patientId       = (int)($data['patientId'] ?? 0);
    $doctorId        = (int)($data['doctorId'] ?? 0);
    $departmentId    = (int)($data['departmentId'] ?? 0);
    $appointmentDate = $data['appointmentDate'] ?? '';
    $appointmentTime = $data['appointmentTime'] ?? '';
    $reason          = trim($data['reason'] ?? '');
    $notes           = $data['notes'] ?? null;

    if ($patientId <= 0 || $doctorId <= 0 || empty($appointmentDate) || empty($appointmentTime) || empty($reason)) {
        sendResponse(400, ['error' => 'patientId, doctorId, appointmentDate, appointmentTime, and reason are required']);
    }

    // Auto-resolve departmentId if missing
    if ($departmentId <= 0) {
        $dStmt = $pdo->prepare('SELECT department_id FROM doctors WHERE id = ?');
        $dStmt->execute([$doctorId]);
        $doc = $dStmt->fetch();
        if (!$doc) {
            sendResponse(404, ['error' => 'Doctor not found']);
        }
        $departmentId = (int)$doc['department_id'];
    }

    $insStmt = $pdo->prepare('
        INSERT INTO appointments (patient_id, doctor_id, department_id, appointment_date, appointment_time, status, reason, notes)
        VALUES (?, ?, ?, ?, ?, "scheduled", ?, ?)
    ');
    $insStmt->execute([$patientId, $doctorId, $departmentId, $appointmentDate, $appointmentTime, $reason, $notes]);
    $apptId = $pdo->lastInsertId();

    $fetchStmt = $pdo->prepare('SELECT * FROM appointments WHERE id = ?');
    $fetchStmt->execute([$apptId]);
    $inserted = $fetchStmt->fetch();

    sendResponse(201, [
        'success'     => true,
        'message'     => 'Appointment booked successfully via PHP backend',
        'appointment' => $inserted
    ]);
}

// ---------------------------------------------------------------------
// 3. UPDATE APPOINTMENT STATUS (PATCH)
// ---------------------------------------------------------------------
if ($method === 'PATCH') {
    $data = getJsonBody();
    $apptId = isset($_GET['id']) ? (int)$_GET['id'] : (int)($data['id'] ?? 0);
    $status = $data['status'] ?? null;
    $notes  = $data['notes'] ?? null;

    if ($apptId <= 0) {
        sendResponse(400, ['error' => 'Appointment ID is required']);
    }

    if ($status) {
        $uStmt = $pdo->prepare('UPDATE appointments SET status = ? WHERE id = ?');
        $uStmt->execute([$status, $apptId]);
    }
    if ($notes !== null) {
        $uStmt = $pdo->prepare('UPDATE appointments SET notes = ? WHERE id = ?');
        $uStmt->execute([$notes, $apptId]);
    }

    $fetchStmt = $pdo->prepare('SELECT * FROM appointments WHERE id = ?');
    $fetchStmt->execute([$apptId]);

    sendResponse(200, [
        'success'     => true,
        'appointment' => $fetchStmt->fetch()
    ]);
}

sendResponse(405, ['error' => 'Method not allowed']);
