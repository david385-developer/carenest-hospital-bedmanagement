# CareNest — Hospital Bed Allocation & Clinical Workflow System

![React](https://img.shields.io/badge/React-18-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)
![Express](https://img.shields.io/badge/Express-REST_API-lightgrey.svg)
![SQLite](https://img.shields.io/badge/SQLite-3-blue.svg)
![Responsive](https://img.shields.io/badge/Responsive-Yes-orange.svg)

A full-stack hospital management application for bed allocation, patient admissions, and doctor clinical workflows.

## Table of Contents
* [Features](#features)
* [Tech Stack](#tech-stack)
* [Screenshots](#screenshots)
* [Getting Started](#getting-started)
* [API Reference](#api-reference)
* [Database Schema](#database-schema)
* [Project Structure](#project-structure)
* [Role-Based Access](#role-based-access)
* [Responsive Design](#responsive-design)
* [Future Enhancements](#future-enhancements)
* [Author](#author)
* [License](#license)

## Features

### Admin Features
* Dashboard with real-time bed occupancy statistics.
* Ward and bed management (add, edit, delete beds).
* User management (doctors, reception staff).
* System-wide occupancy analytics.

### Reception Features
* Patient admission and registration.
* Bed assignment and allocation.
* Discharge processing.
* Transfer requests between wards.

### Doctor Features
* Patient directory with detailed profiles.
* Follow-up status tracking (6 statuses: Stable, Improving, Critical, Under Observation, Recovered, Referred).
* Diagnosis management with ICD-10 codes and symptoms tracking.
* Consultation rounds with vitals recording (BP, Temperature, Pulse, SpO2).
* Emergency ward monitoring.

### System Features
* Role-based authentication (Admin, Doctor, Reception).
* Real-time status badges and notifications.
* Responsive design for desktop, tablet, and mobile.
* Hash-based client-side routing.

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| Frontend | React 18 | UI components and state management |
| Styling | Plain CSS | Custom responsive styles |
| Backend | Node.js + Express | REST API server |
| Database | SQLite3 | Lightweight relational database |
| Icons | Unicode Emojis | Cross-platform icon support |

## Screenshots

![Admin Dashboard](docs/screenshots/admin-dashboard.png)
Admin dashboard showing real-time occupancy statistics

![Doctor Dashboard with Stats Cards](docs/screenshots/doctor-dashboard.png)
Doctor dashboard showing real-time occupancy statistics and metrics

![Patient Detail Page with Diagnosis](docs/screenshots/patient-detail.png)
Patient detail page showcasing clinical documentation and active diagnoses

![Follow-ups Page with Status Badges](docs/screenshots/followups-page.png)
Follow-up page tracking active patient statuses with custom status badges

![Mobile Responsive View](docs/screenshots/mobile-responsive.png)
Mobile responsive screen layouts optimized for smaller screen widths

![Quick Round Form](docs/screenshots/quick-round.png)
Quick consultation round record form optimized for mobile touch inputs

## Getting Started

### Prerequisites
* Node.js v16+ and npm
* Git

### Installation Steps
1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/carenest.git
   cd carenest
   ```
2. Install backend dependencies:
   ```bash
   cd hospital-backend
   npm install
   ```
3. Install frontend dependencies:
   ```bash
   cd ../hospital-frontend
   npm install
   ```
4. Start the backend server:
   ```bash
   cd ../hospital-backend
   node app.js
   # Server runs on http://localhost:5000
   ```
5. Start the frontend development server:
   ```bash
   cd ../hospital-frontend
   npm start
   # Application opens at http://localhost:3000
   ```

### Default Login Credentials
| Role | Username | Password |
| :--- | :--- | :--- |
| Admin | admin | admin123 |
| Doctor | prachi | password123 |
| Reception | johnsmith | reception123 |

## API Reference

### Authentication
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| POST | /api/login | Authenticate user, returns role and token |
| POST | /api/logout | Clear session |

### Patients
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | /api/patients | List all patients |
| GET | /api/patients/:id | Get patient by ID |
| GET | /api/patients/:id/detail | Get patient with bed/admission details |
| POST | /api/patients | Create new patient |
| PUT | /api/patients/:id | Update patient |

### Beds
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | /api/beds | List all beds |
| GET | /api/beds/available | List available beds |
| PUT | /api/beds/:id/allocate | Allocate bed to patient |
| PUT | /api/beds/:id/discharge | Free up bed |

### Admissions
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | /api/admissions | List all admissions |
| POST | /api/admissions | Create admission |
| PUT | /api/admissions/:id/discharge | Process discharge |

### Follow-ups
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | /api/followups | All patients with latest follow-up |
| GET | /api/followups/:patient_id | Follow-ups for patient |
| POST | /api/followups | Add follow-up |
| GET | /api/followups/latest/:patient_id | Latest follow-up |
| GET | /api/followups/critical/count | Count critical patients |

### Diagnosis
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | /api/diagnosis/:patient_id | Diagnosis history |
| POST | /api/diagnosis | Add diagnosis |
| GET | /api/diagnosis/latest/:patient_id | Latest diagnosis |

### Consultation Rounds
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| GET | /api/rounds | All doctor's rounds |
| GET | /api/rounds/today | Today's rounds |
| GET | /api/rounds/patient/:patient_id | Rounds for patient |
| POST | /api/rounds | Save round |
| PUT | /api/rounds/:id/status | Update round status |

## Database Schema

The database uses SQLite3 with enforced foreign keys. Below are the SQL schema definitions:

### users
Stores user accounts for role-based access control.
```sql
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('reception', 'doctor', 'admin')) NOT NULL
);
```

### patients
Stores clinical and demographic data of admitted patients.
```sql
CREATE TABLE IF NOT EXISTS patients (
    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    gender TEXT CHECK(gender IN ('male', 'female', 'other')) NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    emergency_contact TEXT,
    blood_group TEXT,
    medical_history TEXT
);
```

### beds
Stores beds data across multiple wards.
```sql
CREATE TABLE IF NOT EXISTS beds (
    bed_id INTEGER PRIMARY KEY AUTOINCREMENT,
    bed_number TEXT NOT NULL,
    ward_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE')) DEFAULT 'AVAILABLE',
    patient_id INTEGER,
    FOREIGN KEY (ward_id) REFERENCES wards(ward_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    UNIQUE(bed_number, ward_id)
);
```

### admissions
Tracks all active and archived patient admissions.
```sql
CREATE TABLE IF NOT EXISTS admissions (
    admission_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    bed_id INTEGER NOT NULL,
    doctor_id INTEGER,
    admission_type TEXT CHECK(admission_type IN ('EMERGENCY', 'NORMAL', 'TRANSFER')) NOT NULL,
    admission_status TEXT CHECK(admission_status IN ('ACTIVE', 'DISCHARGED', 'TRANSFERRED')) DEFAULT 'ACTIVE',
    diagnosis TEXT,
    notes TEXT,
    admitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
    discharge_date TEXT,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
    FOREIGN KEY (bed_id) REFERENCES beds(bed_id),
    FOREIGN KEY (doctor_id) REFERENCES users(user_id)
);
```

### followups
Tracks active status shifts and notes for patients.
```sql
CREATE TABLE IF NOT EXISTS followups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    status TEXT CHECK(status IN ('Stable','Improving','Critical','Under Observation','Recovered','Referred')),
    notes TEXT,
    updated_by TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);
```

### diagnosis
Stores primary and secondary clinical diagnoses with standard ICD-10 codes.
```sql
CREATE TABLE IF NOT EXISTS diagnosis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    primary_diagnosis TEXT NOT NULL,
    secondary_conditions TEXT,
    symptoms TEXT,
    icd10_code TEXT,
    notes TEXT,
    diagnosed_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);
```

### consultation_rounds
Stores daily vitals and clinical findings recorded during ward rounds.
```sql
CREATE TABLE IF NOT EXISTS consultation_rounds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id TEXT NOT NULL,
    vitals_bp TEXT,
    vitals_temp REAL,
    vitals_pulse INTEGER,
    vitals_spo2 INTEGER,
    findings TEXT NOT NULL,
    treatment_plan TEXT,
    next_round DATETIME,
    status TEXT DEFAULT 'Completed' CHECK(status IN ('Completed','Pending','Rescheduled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);
```

### ER Diagram Description
One patient can have many follow-ups, diagnoses, and consultation rounds.

## Project Structure

```text
carenest/
├── hospital-backend/
│   ├── app.js                 # Express server + SQLite + API routes
│   ├── package.json
│   └── database.sqlite        # Auto-created on first run
│
├── hospital-frontend/
│   ├── public/
│   │   ├── index.html
│   │   └── favicon.ico
│   ├── src/
│   │   ├── App.js             # Main app with hash routing
│   │   ├── index.css          # Global styles + CSS variables
│   │   └── components/
│   │       ├── Navbar/        # Top navigation + profile + logout
│   │       ├── Sidebar/       # Side menu with badges
│   │       ├── Dashboard/     # Role-based dashboard
│   │       ├── Patients/      # Patient directory
│   │       ├── PatientDetail/ # Patient info + diagnosis + rounds
│   │       ├── Admissions/    # Admission management
│   │       ├── BedAllocation/ # Bed management
│   │       ├── EmergencyWard/ # Emergency monitoring
│   │       ├── FollowUps/     # Follow-up status tracking
│   │       ├── ConsultationRounds/ # Ward rounds + vitals
│   │       └── Transfers/     # Patient transfers
│   └── package.json
└── README.md
```

## Role-Based Access Control

| Feature | Admin | Doctor | Reception |
| :--- | :---: | :---: | :---: |
| Dashboard | ✅ | ✅ | ✅ |
| Bed Management | ✅ | ❌ | ❌ |
| Patient Admission | ❌ | ❌ | ✅ |
| Follow-ups | ❌ | ✅ | ❌ |
| Diagnosis | ❌ | ✅ | ❌ |
| Consultation Rounds | ❌ | ✅ | ❌ |
| Discharge | ❌ | ✅ | ✅ |
| Emergency Ward | ✅ | ✅ | ❌ |
| Transfers | ✅ | ✅ | ✅ |

## Responsive Design

### Breakpoints
* Desktop: > 1024px — full sidebar, multi-column layouts.
* Tablet: 768px - 1024px — 2-column grids, condensed sidebar.
* Mobile: 375px - 667px — stacked cards, hamburger menu, icon-only buttons.
* Small Mobile: <= 375px — single column, full-width inputs.

### Mobile-Specific Adaptations
* Tables convert to card layouts.
* Stats grid: 4 columns -> 2x2 -> 1 column.
* Vitals form: 2-column -> stacked layout.
* Sidebar collapses to hamburger menu.
* Logout button: text + icon -> icon-only.

## Future Enhancements
* JWT-based authentication with refresh tokens.
* Real-time notifications via WebSockets.
* PDF report generation for discharge summaries.
* Integration with HL7 FHIR standards.
* Dark mode theme toggle.

## Author
Built as a portfolio project demonstrating full-stack development skills.

David — gollamudidavid385@gmail.com — Linkedin - https://www.linkedin.com/in/david-gollamudi/