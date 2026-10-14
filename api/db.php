<?php
// =====================================================================
// api/db.php — Database Connection Engine (PHP PDO with MySQL & SQLite)
// Touchless Hospital Management System (Kuwait University - 2026)
// =====================================================================

header('Content-Type: application/json; charset=UTF-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Preflight CORS handler
if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$pdo = null;
$dbType = 'mysql';

// 1. Try MySQL Connection (XAMPP Default: 127.0.0.1, user: root, password: "")
$host = '127.0.0.1';
$dbName = 'touchless_hms';
$user = 'root';
$pass = '';

try {
    $dsn = "mysql:host=$host;dbname=$dbName;charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
    ];
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    // 2. Graceful fallback: If MySQL is not running, use embedded SQLite
    try {
        $sqlitePath = dirname(__DIR__) . '/database/touchless_hms.db';
        $pdo = new PDO("sqlite:$sqlitePath");
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        $pdo->exec('PRAGMA foreign_keys = ON;');
        $dbType = 'sqlite';
    } catch (\PDOException $sqle) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error'   => 'Database connection failed',
            'mysql_error' => $e->getMessage(),
            'sqlite_error' => $sqle->getMessage()
        ]);
        exit;
    }
}

// Helper: send JSON
function sendResponse($statusCode, $data) {
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// Helper: get JSON request body
function getJsonBody() {
    $raw = file_get_contents('php://input');
    if (empty($raw)) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}
