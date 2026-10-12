# 🏥 Touchless Hospital Management System (Touchless HMS)

> **Graduate Capstone Project — Kuwait University (2026)**  
> **Author:** Dana Alghareb  
> **Live Demo:** [https://23244545454.github.io/touchless-hopital/](https://23244545454.github.io/touchless-hopital/)

---

## 📋 Overview
Touchless HMS is a healthcare management system designed for sterile medical environments (such as Surgical Operating Rooms, ICUs, and clinic kiosks). It eliminates physical contact with keyboards, touchscreens, and mice by utilizing **Leap Motion Controller (LM-010)** optical hand tracking, with automatic fallbacks to **Webcam (MediaPipe Hands)** and **Mouse Simulation**.

---

## 🚀 How to Run the Project

### Option 1: Live in Browser (Zero Installation)
Simply open the GitHub Pages link on any computer:
👉 **[https://23244545454.github.io/touchless-hopital/](https://23244545454.github.io/touchless-hopital/)**

---

### Option 2: Run Locally on Your PC (With Leap Motion Controller)

#### 1. Prerequisites:
- **Node.js** installed ([nodejs.org](https://nodejs.org/)).
- **Leap Motion Software (Orion v4.1.0)** installed on Windows.
- **Leap Motion Controller (Model LM-010)** connected via USB.

#### 2. Leap Motion Setup:
1. Install **Leap Motion Orion 4.1.0** on your Windows PC.
2. Plug the Leap Motion LM-010 into a USB port (the sensor icon in the taskbar will turn green 🟢).
3. Right-click the green Leap Motion icon in the taskbar $\rightarrow$ select **Control Panel**.
4. Check the box: **`Allow Web Apps`** $\rightarrow$ click **Apply** $\rightarrow$ **OK**.

#### 3. Launch the Project:
- **One-Click:** Double-click `start-touchless-hms.bat` in the project folder.  
- **Or via Terminal:**
  ```bash
  node server.js
  ```
- Open your browser to: **[http://localhost:3000](http://localhost:3000)**

---

### Option 3: Run Locally Without Leap Motion (Webcam & Mouse Fallback)
If you don't have the Leap Motion hardware:
1. Double-click `start-touchless-hms.bat` or run `node server.js`.
2. Open **[http://localhost:3000/dashboard-doctor.html](http://localhost:3000/dashboard-doctor.html)**.
3. Click **"Start Camera"** on the floating widget to use your laptop webcam for hand tracking via Google MediaPipe Hands!
4. Or use **Mouse Simulation Mode**: Hover over any button for 1 second to trigger an automatic click, or drag to swipe.

---

## 🖐️ Gesture Controls

| Gesture | How to Perform | Action Triggered |
| :--- | :--- | :--- |
| **Hover / Dwell** | Hold hand steady over button for 1.2s | Clicks / Activates the button |
| **Push / Screen Tap** | Push hand / index finger forward in the air | Instant touchless click |
| **Swipe Left / Right** | Rapid horizontal hand sweep | Next / Previous patient record or tab |
| **Swipe Up / Down** | Vertical hand motion | Scrolls pages and history |
| **Pinch** | Bring thumb and index fingertips together | Zooms CT scans & medical imaging |
| **Open Palm Hold** | Hold open flat hand steady for 1.5s | Silences alarms & completes biometric login |

---

## 🖥️ System Modules & Interfaces
1. **Touchless Patient Appointment Kiosk (`dashboard-patient.html`)**: Interactive hands-free kiosk where patients register, search specialist doctors dynamically by department, and book appointments hands-free using Leap Motion gestures.
2. **Doctor Clinical Workstation (`dashboard-doctor.html`)**: Real-time scheduled clinic appointments linked to the SQLite database, patient medical records, e-prescriptions, and vital monitoring.
3. **Nurse Ward Station (`dashboard-nurse.html`)**: Floor 3 Cardiology & ICU bed map with telemetry vitals and touchless alarm dismissal.
4. **Authentication Portal (`login.html`)**: Dual-mode login & patient registration connected to the backend REST API.
5. **Interactive Gesture Simulator (`demo.html`)**: Testing and calibration sandbox for hand gestures and webcam tracking.
6. **System Architecture & Database Report (`docs/database_documentation.md`)**: Full ER diagram, SQL schema specifications, foreign key definitions, and meeting notes for graduation reports.

---

## 🛠️ Technology Stack
- **Frontend:** Semantic HTML5, Vanilla CSS3 (Glassmorphism design tokens), Native JavaScript (ES6+).
- **Backend Server:** Node.js HTTP Server (`server.js`) with REST API endpoints (`/api/auth/*`, `/api/doctors`, `/api/departments`, `/api/appointments`, `/api/prescriptions`, `/api/vitals`).
- **Database Engine:** Embedded Relational SQLite (`database/touchless_hms.db`) with full ANSI SQL schema (`database/schema.sql`), strict foreign key relations, and zero third-party npm dependencies.
- **Hardware Integration:** Leap Motion Controller (Model LM-010) streaming raw skeleton frames via WebSocket (`ws://127.0.0.1:6437/v6.json`).
- **Computer Vision Fallback:** Google MediaPipe Hands (Webcam Tracking).
- **Auditory Feedback:** Web Audio API (real-time frequency synthesize feedback for touchless gestures).

