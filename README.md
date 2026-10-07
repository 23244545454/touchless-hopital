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

## 🖥️ System Dashboards
1. **Surgeon OR Dashboard (`dashboard-surgeon.html`)**: Live surgical vitals (HR, SpO₂, EtCO₂), CT imaging viewer, elapsed timer, alarm silencing.
2. **Doctor Workstation (`dashboard-doctor.html`)**: Clinic appointments, patient roster, e-prescriptions, and telemedicine.
3. **Nurse Station (`dashboard-nurse.html`)**: Ward bed map (Floor 3 Cardiology & ICU) with touch-free alarm dismissal.
4. **Patient Kiosk (`dashboard-patient.html`)**: Contactless check-in, appointments, and medication schedules.
5. **Biometric Login (`login.html`)**: Touchless palm detection authentication.
6. **Live Demo Playground (`demo.html`)**: Interactive gesture testing zone.

---

## 🛠️ Technology Stack
- **Frontend:** HTML5, CSS3 (Modern Glassmorphism & Dark Mode), Vanilla JavaScript.
- **Hardware Integration:** Leap Motion Controller (LM-010) via WebSocket (`ws://127.0.0.1:6437/v6.json`).
- **Computer Vision Fallback:** Google MediaPipe Hands (Webcam Tracking).
- **Audio Feedback:** Web Audio API (real-time auditory chimes for gestures).
- **Local Server:** Zero-dependency Node.js HTTP server.
