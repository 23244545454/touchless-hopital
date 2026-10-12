<?php
// =====================================================================
// api/vitals.php — Vitals Logging API (GET, POST)
// =====================================================================

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $patientId = isset($_GET['patient_id']) ? (int)$_GET['patient_id'] : 1;
    $stmt = $pdo->prepare('SELECT * FROM vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 20');
    $stmt->execute([$patientId]);

    sendResponse(200, [
        'success' => true,
        'backend' => 'PHP ' . PHP_VERSION,
        'vitals'  => $stmt->fetchAll()
    ]);
}

if ($method === 'POST') {
    $data = getJsonBody();
    $patId = (int)($data['patientId'] ?? 0);
    $hr    = (int)($data['heartRate'] ?? 72);
    $bp    = $data['bloodPressure'] ?? '120/80';
    $spo2  = (int)($data['spo2'] ?? 98);
    $temp  = (float)($data['temperature'] ?? 36.8);

    if ($patId <= 0) {
        sendResponse(400, ['error' => 'patientId is required']);
    }

    $insStmt = $pdo->prepare('
        INSERT INTO vitals (patient_id, heart_rate, blood_pressure, spo2, temperature)
        VALUES (?, ?, ?, ?, ?)
    ');
    $insStmt->execute([$patId, $hr, $bp, $spo2, $temp]);
    $vId = $pdo->lastInsertId();

    $fStmt = $pdo->prepare('SELECT * FROM vitals WHERE id = ?');
    $fStmt->execute([$vId]);

    sendResponse(201, [
        'success' => true,
        'vital'   => $fStmt->fetch()
    ]);
}

sendResponse(405, ['error' => 'Method not allowed']);
