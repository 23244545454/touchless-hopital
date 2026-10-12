<?php
// =====================================================================
// api/doctors.php — Doctors Directory with Search and Department Filter
// =====================================================================

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(405, ['error' => 'Method not allowed']);
}

$deptId = isset($_GET['department_id']) ? (int)$_GET['department_id'] : 0;
$search = isset($_GET['search']) ? trim($_GET['search']) : '';

$sql = '
    SELECT doc.id, doc.user_id, doc.department_id, doc.specialization, doc.room_number,
           doc.bio, doc.available_days, doc.consultation_fee, doc.rating,
           u.full_name, u.email, u.phone, u.avatar,
           dep.name as department_name, dep.floor as department_floor, dep.icon as department_icon
    FROM doctors doc
    JOIN users u ON doc.user_id = u.id
    JOIN departments dep ON doc.department_id = dep.id
    WHERE 1=1
';
$params = [];

if ($deptId > 0) {
    $sql .= ' AND doc.department_id = ?';
    $params[] = $deptId;
}

if (!empty($search)) {
    $term = '%' . strtolower($search) . '%';
    $sql .= ' AND (LOWER(u.full_name) LIKE ? OR LOWER(doc.specialization) LIKE ? OR LOWER(dep.name) LIKE ?)';
    $params[] = $term;
    $params[] = $term;
    $params[] = $term;
}

$sql .= ' ORDER BY doc.id ASC';

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$doctors = $stmt->fetchAll();

sendResponse(200, [
    'success' => true,
    'backend' => 'PHP ' . PHP_VERSION,
    'doctors' => $doctors
]);
