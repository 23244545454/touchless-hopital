<?php
// =====================================================================
// api/departments.php — Departments Listing with Doctor Count
// =====================================================================

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(405, ['error' => 'Method not allowed']);
}

$stmt = $pdo->query('
    SELECT d.id, d.name, d.floor, d.description, d.icon,
           COUNT(doc.id) as doctor_count
    FROM departments d
    LEFT JOIN doctors doc ON d.id = doc.department_id
    GROUP BY d.id
    ORDER BY d.id ASC
');
$departments = $stmt->fetchAll();

sendResponse(200, [
    'success'     => true,
    'backend'     => 'PHP ' . PHP_VERSION,
    'departments' => $departments
]);
