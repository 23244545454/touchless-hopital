-- =====================================================================
-- Touchless Hospital Management System (Touchless HMS)
-- MySQL / MariaDB Relational Database Schema & Kuwait Hospital Seed Data
-- Compatible with XAMPP, phpMyAdmin, and MySQL 5.7+ / 8.0+ / MariaDB 10+
-- =====================================================================

CREATE DATABASE IF NOT EXISTS `touchless_hms` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `touchless_hms`;

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `vitals`;
DROP TABLE IF EXISTS `prescriptions`;
DROP TABLE IF EXISTS `appointments`;
DROP TABLE IF EXISTS `patients`;
DROP TABLE IF EXISTS `doctors`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `departments`;
SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- 1. DEPARTMENTS TABLE
-- ---------------------------------------------------------------------
CREATE TABLE `departments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `name` VARCHAR(100) NOT NULL UNIQUE,
    `floor` VARCHAR(50) NOT NULL,
    `description` TEXT NULL,
    `icon` VARCHAR(10) DEFAULT '🏥',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 2. USERS TABLE
-- Central Authentication & Identity Table
-- ---------------------------------------------------------------------
CREATE TABLE `users` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `full_name` VARCHAR(150) NOT NULL,
    `email` VARCHAR(150) NOT NULL UNIQUE,
    `password_hash` VARCHAR(255) NOT NULL,
    `role` ENUM('patient', 'doctor', 'nurse', 'admin') NOT NULL DEFAULT 'patient',
    `phone` VARCHAR(30) NULL,
    `avatar` VARCHAR(20) DEFAULT '👤',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 3. DOCTORS TABLE
-- Relational foreign keys to users and departments
-- ---------------------------------------------------------------------
CREATE TABLE `doctors` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `department_id` INT NOT NULL,
    `specialization` VARCHAR(150) NOT NULL,
    `room_number` VARCHAR(50) NOT NULL,
    `bio` TEXT NULL,
    `available_days` VARCHAR(100) DEFAULT 'Sun,Mon,Tue,Wed,Thu',
    `consultation_fee` DECIMAL(10,2) DEFAULT 30.00,
    `rating` DECIMAL(3,2) DEFAULT 5.00,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_doctor_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_doctor_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 4. PATIENTS TABLE
-- Extended demographic and clinical records
-- ---------------------------------------------------------------------
CREATE TABLE `patients` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `user_id` INT NOT NULL UNIQUE,
    `civil_id` VARCHAR(12) UNIQUE NULL,
    `date_of_birth` DATE NULL,
    `gender` ENUM('male', 'female', 'other') DEFAULT 'other',
    `blood_type` VARCHAR(5) DEFAULT 'O+',
    `emergency_contact` VARCHAR(100) NULL,
    `medical_history` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_patient_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 5. APPOINTMENTS TABLE
-- Crucial entity linking patients, doctors, and departments via FKs
-- ---------------------------------------------------------------------
CREATE TABLE `appointments` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `doctor_id` INT NOT NULL,
    `department_id` INT NOT NULL,
    `appointment_date` DATE NOT NULL,
    `appointment_time` VARCHAR(20) NOT NULL,
    `status` ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'scheduled',
    `reason` VARCHAR(255) NOT NULL,
    `notes` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_appt_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_appt_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE RESTRICT,
    CONSTRAINT `fk_appt_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 6. PRESCRIPTIONS TABLE
-- Medication orders linked to patients, doctors, and appointments
-- ---------------------------------------------------------------------
CREATE TABLE `prescriptions` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `appointment_id` INT NULL,
    `patient_id` INT NOT NULL,
    `doctor_id` INT NOT NULL,
    `medication_name` VARCHAR(150) NOT NULL,
    `dosage` VARCHAR(100) NOT NULL,
    `frequency` VARCHAR(100) DEFAULT 'Once daily',
    `duration` VARCHAR(100) DEFAULT '30 days',
    `instructions` TEXT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_presc_appt` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL,
    CONSTRAINT `fk_presc_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_presc_doctor` FOREIGN KEY (`doctor_id`) REFERENCES `doctors` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- 7. VITALS TABLE
-- Telemetry and clinical vital signs observations
-- ---------------------------------------------------------------------
CREATE TABLE `vitals` (
    `id` INT AUTO_INCREMENT PRIMARY KEY,
    `patient_id` INT NOT NULL,
    `heart_rate` INT NOT NULL,
    `blood_pressure` VARCHAR(20) NOT NULL,
    `spo2` INT NOT NULL,
    `temperature` DECIMAL(4,1) NOT NULL,
    `recorded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `fk_vitals_patient` FOREIGN KEY (`patient_id`) REFERENCES `patients` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- SEED DATA — KUWAIT HOSPITAL DEPARTMENTS & STAFF
-- =====================================================================

INSERT INTO `departments` (`id`, `name`, `floor`, `description`, `icon`) VALUES
(1, 'Cardiology', 'Floor 3', 'Cardiovascular health, ECG, echocardiography, and heart disease management.', '❤️'),
(2, 'Neurology', 'Floor 4', 'Brain, spinal cord, neurological disorders, and nerve diagnostics.', '🧠'),
(3, 'Pediatrics', 'Floor 2', 'Comprehensive child healthcare, infant wellness, and pediatric medicine.', '👶'),
(4, 'Orthopedics', 'Floor 1', 'Bone fractures, joint replacements, sports injuries, and musculoskeletal care.', '🦴'),
(5, 'Internal Medicine', 'Floor 2', 'Adult diseases, metabolic health, preventative care, and chronic conditions.', '🩺');

-- Pre-seed Users (Password: password123)
INSERT INTO `users` (`id`, `full_name`, `email`, `password_hash`, `role`, `phone`, `avatar`) VALUES
(1, 'Dr. Ahmed Al-Rashidi', 'ahmed@hospital.kw', 'password123', 'doctor', '+965 99123456', '👨‍⚕️'),
(2, 'Dr. Reem Al-Zahra', 'reem@hospital.kw', 'password123', 'doctor', '+965 99234567', '👩‍⚕️'),
(3, 'Dr. Khalid Al-Mutairi', 'khalid@hospital.kw', 'password123', 'doctor', '+965 99345678', '👨‍⚕️'),
(4, 'Dr. Maryam Al-Sabah', 'maryam@hospital.kw', 'password123', 'doctor', '+965 99456789', '👩‍⚕️'),
(5, 'Dr. Faisal Al-Enezi', 'faisal@hospital.kw', 'password123', 'doctor', '+965 99567890', '👨‍⚕️'),
(6, 'Sarah Al-Mansouri', 'sarah@patient.kw', 'password123', 'patient', '+965 99678901', '👤'),
(7, 'Bader Al-Otaibi', 'bader@patient.kw', 'password123', 'patient', '+965 99789012', '👤'),
(8, 'Noura Al-Kandari', 'noura@patient.kw', 'password123', 'patient', '+965 99890123', '👤'),
(9, 'Nurse Fatima Al-Zahra', 'fatima@nurse.kw', 'password123', 'nurse', '+965 99901234', '💉'),
(10, 'Admin Director', 'admin@hospital.kw', 'password123', 'admin', '+965 99012345', '⚙️');

-- Doctors Profiles
INSERT INTO `doctors` (`id`, `user_id`, `department_id`, `specialization`, `room_number`, `bio`, `available_days`, `consultation_fee`, `rating`) VALUES
(1, 1, 1, 'Senior Consultant Cardiologist', 'Clinic 301', 'Over 16 years specializing in interventional cardiology and arrhythmia management.', 'Sun,Mon,Tue,Wed,Thu', 35.00, 4.95),
(2, 2, 2, 'Consultant Neurologist', 'Clinic 405', 'Specialist in epilepsy, migraine disorders, and cognitive neuro-diagnostics.', 'Sun,Tue,Thu', 40.00, 4.88),
(3, 3, 4, 'Orthopedic & Spine Surgeon', 'Clinic 112', 'Fellowship in arthroscopic surgery, joint replacement, and sports medicine.', 'Mon,Wed,Thu', 35.00, 4.92),
(4, 4, 3, 'Consultant Pediatrician', 'Clinic 208', 'Dedicated to neonatal care, childhood developmental health, and immunizations.', 'Sun,Mon,Tue,Wed', 25.00, 4.97),
(5, 5, 5, 'Internal Medicine Specialist', 'Clinic 214', 'Expert in hypertension, diabetes management, and preventive adult healthcare.', 'Sun,Mon,Tue,Wed,Thu', 30.00, 4.85);

-- Patients Profiles
INSERT INTO `patients` (`id`, `user_id`, `civil_id`, `date_of_birth`, `gender`, `blood_type`, `emergency_contact`, `medical_history`) VALUES
(1, 6, '284051201948', '1984-05-12', 'female', 'O+', 'Jasem Al-Mansouri (+965 99112233)', 'Hypertension, seasonal allergies to penicillin.'),
(2, 7, '291081502391', '1991-08-15', 'male', 'A+', 'Hamad Al-Otaibi (+965 99223344)', 'Type 2 Diabetes well-managed on Metformin.'),
(3, 8, '298110303842', '1998-11-03', 'female', 'B-', 'Hessa Al-Kandari (+965 99334455)', 'Post-arthroscopic knee surgery recovery.');

-- Sample Appointments linking Patients, Doctors, and Departments
INSERT INTO `appointments` (`id`, `patient_id`, `doctor_id`, `department_id`, `appointment_date`, `appointment_time`, `status`, `reason`, `notes`) VALUES
(1, 1, 1, 1, '2026-10-15', '10:00 AM', 'confirmed', 'Routine cardiac follow-up and blood pressure review', 'Patient requested morning slot.'),
(2, 1, 2, 2, '2026-10-22', '02:30 PM', 'scheduled', 'Consultation for recurring tension headaches', 'Referred by internal medicine.'),
(3, 2, 5, 5, '2026-10-16', '11:15 AM', 'confirmed', 'Annual comprehensive health checkup and blood panel', 'Fasting required for blood tests.'),
(4, 3, 3, 4, '2026-10-18', '09:30 AM', 'scheduled', 'Follow-up for knee joint stiffness after physical therapy', 'Bring previous MRI scan.');

-- Prescriptions
INSERT INTO `prescriptions` (`id`, `appointment_id`, `patient_id`, `doctor_id`, `medication_name`, `dosage`, `frequency`, `duration`, `instructions`) VALUES
(1, 1, 1, 1, 'Amlodipine', '5mg', 'Once daily in the morning', '30 days', 'Take with a full glass of water.'),
(2, 1, 1, 1, 'Aspirin', '81mg', 'Once daily with meal', '60 days', 'Cardioprotective low dose.'),
(3, 3, 2, 5, 'Metformin', '500mg', 'Twice daily with meals', '90 days', 'Monitor fasting glucose weekly.');

-- Vitals
INSERT INTO `vitals` (`id`, `patient_id`, `heart_rate`, `blood_pressure`, `spo2`, `temperature`) VALUES
(1, 1, 74, '120/80', 98, 36.8),
(2, 2, 68, '130/85', 96, 37.1),
(3, 3, 80, '110/70', 99, 36.5);
