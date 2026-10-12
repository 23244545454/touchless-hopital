<?php
// =====================================================================
// router.php — PHP Built-in Server Router for Touchless HMS
// Allows running PHP backend + Static Frontend on http://localhost:3000
// =====================================================================

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// 1. Route API requests to PHP scripts
if (strpos($uri, '/api/auth/') === 0) {
    $_GET['action'] = basename($uri);
    require __DIR__ . '/api/auth.php';
    exit;
}

if ($uri === '/api/departments') {
    require __DIR__ . '/api/departments.php';
    exit;
}

if ($uri === '/api/doctors' || strpos($uri, '/api/doctors/') === 0) {
    require __DIR__ . '/api/doctors.php';
    exit;
}

if ($uri === '/api/appointments' || strpos($uri, '/api/appointments/') === 0) {
    if (preg_match('#^/api/appointments/(\d+)$#', $uri, $m)) {
        $_GET['id'] = $m[1];
    }
    require __DIR__ . '/api/appointments.php';
    exit;
}

if ($uri === '/api/prescriptions') {
    require __DIR__ . '/api/prescriptions.php';
    exit;
}

if ($uri === '/api/vitals') {
    require __DIR__ . '/api/vitals.php';
    exit;
}

if ($uri === '/api/patients') {
    require __DIR__ . '/api/patients.php';
    exit;
}

// 2. Serve static files (HTML, CSS, JS, images)
$filePath = __DIR__ . $uri;

if ($uri === '/' || empty($uri)) {
    $filePath = __DIR__ . '/index.html';
}

if (file_exists($filePath) && !is_dir($filePath)) {
    return false; // Let PHP built-in server handle standard static file serving
}

http_response_code(404);
echo json_encode(['error' => 'Resource not found: ' . $uri]);
