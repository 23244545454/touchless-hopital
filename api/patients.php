<?php
// =====================================================================
// api/patients.php — Patients Listing API (GET)
// =====================================================================

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(405, ['error' => 'Method not allowed']);
}

$stmt = $pdo->query('
    SELECT p.id as patient_id, u.id as user_id, u.full_name, u.email, u.phone, u.avatar,
           p.civil_id, p.date_of_birth, p.gender, p.blood_type, p.emergency_contact, p.medical_history
    FROM patients p
    JOIN users u ON p.user_id = u.id
    ORDER BY p.id ASC
');

sendResponse(200, [
    'success'  => true,
    'backend'  => 'PHP ' . PHP_VERSION,
    'patients' => $stmt->fetchAll()
]);
