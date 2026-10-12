<?php
// =====================================================================
// api/auth.php — Authentication API (Login & Registration)
// =====================================================================

require_once __DIR__ . '/db.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = isset($_GET['action']) ? $_GET['action'] : '';

// ---------------------------------------------------------------------
// 1. REGISTER NEW PATIENT
// ---------------------------------------------------------------------
if ($method === 'POST' && ($action === 'register' || strpos($_SERVER['REQUEST_URI'], 'register') !== false)) {
    $data = getJsonBody();
    $fullName = trim($data['fullName'] ?? '');
    $email    = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';
    $phone    = trim($data['phone'] ?? '');
    $civilId  = trim($data['civilId'] ?? '');
    $gender   = $data['gender'] ?? 'other';
    $blood    = $data['bloodType'] ?? 'O+';
    $contact  = $data['emergencyContact'] ?? null;

    if (empty($fullName) || empty($email) || empty($password)) {
        sendResponse(400, ['error' => 'Full name, email, and password are required']);
    }

    // Check if email already exists
    $checkStmt = $pdo->prepare('SELECT id FROM users WHERE LOWER(email) = ?');
    $checkStmt->execute([$email]);
    if ($checkStmt->fetch()) {
        sendResponse(409, ['error' => 'An account with this email already exists']);
    }

    // Insert user
    $userStmt = $pdo->prepare('INSERT INTO users (full_name, email, password_hash, role, phone, avatar) VALUES (?, ?, ?, ?, ?, ?)');
    $userStmt->execute([$fullName, $email, $password, 'patient', $phone ?: null, '👤']);
    $userId = $pdo->lastInsertId();

    // Insert patient profile
    $patStmt = $pdo->prepare('INSERT INTO patients (user_id, civil_id, date_of_birth, gender, blood_type, emergency_contact) VALUES (?, ?, ?, ?, ?, ?)');
    $patStmt->execute([$userId, $civilId ?: null, null, $gender, $blood, $contact]);
    $patientId = $pdo->lastInsertId();

    sendResponse(201, [
        'success' => true,
        'message' => 'Account registered successfully via PHP backend',
        'user' => [
            'id' => (int)$userId,
            'fullName' => $fullName,
            'email' => $email,
            'role' => 'patient',
            'phone' => $phone,
            'avatar' => '👤',
            'patientId' => (int)$patientId
        ]
    ]);
}

// ---------------------------------------------------------------------
// 2. SIGN IN / LOGIN
// ---------------------------------------------------------------------
if ($method === 'POST') {
    $data = getJsonBody();
    $email    = strtolower(trim($data['email'] ?? ''));
    $password = $data['password'] ?? '';

    if (empty($email) || empty($password)) {
        sendResponse(400, ['error' => 'Email and password are required']);
    }

    $stmt = $pdo->prepare('SELECT id, full_name, email, password_hash, role, phone, avatar FROM users WHERE LOWER(email) = ?');
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || $user['password_hash'] !== $password) {
        sendResponse(401, ['error' => 'Invalid email or password']);
    }

    $extra = [];
    if ($user['role'] === 'patient') {
        $pStmt = $pdo->prepare('SELECT id as patient_id, blood_type, civil_id FROM patients WHERE user_id = ?');
        $pStmt->execute([$user['id']]);
        $p = $pStmt->fetch();
        if ($p) {
            $extra = [
                'patientId' => (int)$p['patient_id'],
                'bloodType' => $p['blood_type'],
                'civilId'   => $p['civil_id']
            ];
        }
    } else if ($user['role'] === 'doctor') {
        $dStmt = $pdo->prepare('SELECT id as doctor_id, specialization, room_number FROM doctors WHERE user_id = ?');
        $dStmt->execute([$user['id']]);
        $d = $dStmt->fetch();
        if ($d) {
            $extra = [
                'doctorId'       => (int)$d['doctor_id'],
                'specialization' => $d['specialization'],
                'roomNumber'     => $d['room_number']
            ];
        }
    }

    sendResponse(200, [
        'success' => true,
        'backend' => 'PHP ' . PHP_VERSION . " ($dbType)",
        'user' => array_merge([
            'id'       => (int)$user['id'],
            'fullName' => $user['full_name'],
            'email'    => $user['email'],
            'role'     => $user['role'],
            'phone'    => $user['phone'],
            'avatar'   => $user['avatar']
        ], $extra)
    ]);
}

sendResponse(405, ['error' => 'Method not allowed']);
