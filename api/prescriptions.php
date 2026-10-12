<?php
// =====================================================================
// api/prescriptions.php — Prescriptions API (GET, POST)
// =====================================================================

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $patientId = isset($_GET['patient_id']) ? (int)$_GET['patient_id'] : 0;
    $doctorId  = isset($_GET['doctor_id'])  ? (int)$_GET['doctor_id']  : 0;

    $sql = '
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
    ';
    $params = [];

    if ($patientId > 0) {
        $sql .= ' AND pr.patient_id = ?';
        $params[] = $patientId;
    }
    if ($doctorId > 0) {
        $sql .= ' AND pr.doctor_id = ?';
        $params[] = $doctorId;
    }

    $sql .= ' ORDER BY pr.created_at DESC';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    sendResponse(200, [
        'success'       => true,
        'backend'       => 'PHP ' . PHP_VERSION,
        'prescriptions' => $stmt->fetchAll()
    ]);
}

if ($method === 'POST') {
    $data = getJsonBody();
    $apptId  = (int)($data['appointmentId'] ?? 0);
    $patId   = (int)($data['patientId'] ?? 0);
    $docId   = (int)($data['doctorId'] ?? 0);
    $med     = trim($data['medicationName'] ?? '');
    $dose    = trim($data['dosage'] ?? '');
    $freq    = $data['frequency'] ?? 'Once daily';
    $dur     = $data['duration'] ?? '30 days';
    $notes   = $data['instructions'] ?? null;

    if ($patId <= 0 || $docId <= 0 || empty($med) || empty($dose)) {
        sendResponse(400, ['error' => 'patientId, doctorId, medicationName, and dosage are required']);
    }

    $insStmt = $pdo->prepare('
        INSERT INTO prescriptions (appointment_id, patient_id, doctor_id, medication_name, dosage, frequency, duration, instructions)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ');
    $insStmt->execute([$apptId > 0 ? $apptId : null, $patId, $docId, $med, $dose, $freq, $dur, $notes]);
    $rxId = $pdo->lastInsertId();

    $fStmt = $pdo->prepare('SELECT * FROM prescriptions WHERE id = ?');
    $fStmt->execute([$rxId]);

    sendResponse(201, [
        'success'      => true,
        'prescription' => $fStmt->fetch()
    ]);
}

sendResponse(405, ['error' => 'Method not allowed']);
