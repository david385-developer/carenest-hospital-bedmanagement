const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());


const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'hospital-secret-key';
const DB_PATH = path.join(__dirname, 'hospital.db');

let db = null;

// ==================== AUTH MIDDLEWARE ====================
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
};

const requireRole = (roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions for this action.' });
        }
        next();
    };
};

// ==================== DB INITIALIZATION ====================
const initializeServerAndDB = async () => {
    try {
        db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database
        });

        // Enable foreign keys
        await db.exec('PRAGMA foreign_keys = ON');

        // Create all tables
        await db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                username TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                role TEXT CHECK(role IN ('reception', 'doctor', 'admin')) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS wards (
                ward_id INTEGER PRIMARY KEY AUTOINCREMENT,
                ward_name TEXT NOT NULL UNIQUE,
                ward_type TEXT CHECK(ward_type IN ('general', 'icu', 'emergency', 'pediatric', 'maternity')) NOT NULL
            );

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

            CREATE TABLE IF NOT EXISTS patient_transfers (
                transfer_id INTEGER PRIMARY KEY AUTOINCREMENT,
                admission_id INTEGER NOT NULL,
                from_bed_id INTEGER,
                to_bed_id INTEGER NOT NULL,
                from_ward_id INTEGER,
                to_ward_id INTEGER NOT NULL,
                transfer_reason TEXT,
                transferred_by INTEGER NOT NULL,
                transfer_date TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (admission_id) REFERENCES admissions(admission_id),
                FOREIGN KEY (to_bed_id) REFERENCES beds(bed_id),
                FOREIGN KEY (transferred_by) REFERENCES users(user_id)
            );

            CREATE TABLE IF NOT EXISTS discharge_records (
                discharge_id INTEGER PRIMARY KEY AUTOINCREMENT,
                admission_id INTEGER NOT NULL,
                patient_id INTEGER NOT NULL,
                discharged_by INTEGER NOT NULL,
                discharge_type TEXT CHECK(discharge_type IN ('NORMAL', 'AGAINST_ADVICE', 'EXPIRED', 'TRANSFERRED')) DEFAULT 'NORMAL',
                discharge_date TEXT DEFAULT CURRENT_TIMESTAMP,
                final_diagnosis TEXT,
                discharge_notes TEXT,
                FOREIGN KEY (admission_id) REFERENCES admissions(admission_id),
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
                FOREIGN KEY (discharged_by) REFERENCES users(user_id)
            );

            CREATE TABLE IF NOT EXISTS notifications (
                notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
                type TEXT CHECK(type IN ('ICU_ALERT', 'BED_AVAILABLE', 'EMERGENCY_ADMISSION', 'MAINTENANCE')) NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS followups (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                patient_id INTEGER NOT NULL,
                status TEXT CHECK(status IN ('Stable','Improving','Critical','Under Observation','Recovered','Referred')),
                notes TEXT,
                updated_by TEXT NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
            );

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
        `);

        // Seed default admin
        await seedDefaultData();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}/`);
        });

    } catch (e) {
        console.error(`DB Error: ${e.message}`);
        process.exit(1);
    }
};

const seedDefaultData = async () => {
    const adminExists = await db.get('SELECT user_id FROM users WHERE role = ?', ['admin']);
    
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await db.run(
            'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
            ['System Admin', 'admin', hashedPassword, 'admin']
        );

        // Seed sample wards
        const wards = [
            ['General Ward A', 'general'],
            ['ICU Unit 1', 'icu'],
            ['Emergency Ward', 'emergency'],
            ['Pediatric Ward', 'pediatric'],
            ['Maternity Ward', 'maternity']
        ];
        
        for (const ward of wards) {
            await db.run('INSERT OR IGNORE INTO wards (ward_name, ward_type) VALUES (?, ?)', ward);
        }

        // Seed default beds for each ward
        const beds = [
            ['A-101', 1, 'AVAILABLE'],
            ['A-102', 1, 'AVAILABLE'],
            ['A-103', 1, 'AVAILABLE'],
            ['ICU-01', 2, 'AVAILABLE'],
            ['ICU-02', 2, 'AVAILABLE'],
            ['ER-01', 3, 'AVAILABLE'],
            ['ER-02', 3, 'AVAILABLE'],
            ['PED-01', 4, 'AVAILABLE'],
            ['MAT-01', 5, 'AVAILABLE']
        ];
        for (const bed of beds) {
            await db.run('INSERT OR IGNORE INTO beds (bed_number, ward_id, status) VALUES (?, ?, ?)', bed);
        }
        
        console.log('Default data seeded. Admin login: admin / admin123');
    }

    // Seed JohnSmith and Dr Prachi if they do not exist
    const johnExists = await db.get('SELECT user_id FROM users WHERE username = ?', ['johnsmith']);
    if (!johnExists) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        await db.run(
            'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
            ['JohnSmith', 'johnsmith', hashedPassword, 'reception']
        );
        console.log('Seeded user JohnSmith (receptionist)');
    }

    const prachiExists = await db.get('SELECT user_id FROM users WHERE username = ?', ['prachi']);
    if (!prachiExists) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        await db.run(
            'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
            ['Dr Prachi', 'prachi', hashedPassword, 'doctor']
        );
        console.log('Seeded user Dr Prachi (doctor)');
    }

    // Seed default patients if patients table is empty
    const patientCount = await db.get('SELECT COUNT(*) as count FROM patients');
    if (patientCount.count === 0) {
        const patientsToSeed = [
            ['Alice Smith', 32, 'female', '111-222-3333', '111-222-4444', 'O+', 'None'],
            ['Bob Jones', 45, 'male', '222-333-4444', '222-333-5555', 'A-', 'Hypertension'],
            ['Charlie Brown', 68, 'male', '333-444-5555', '333-444-6666', 'B+', 'Diabetes'],
            ['Diana Prince', 29, 'female', '444-555-6666', '444-555-7777', 'AB+', 'None']
        ];
        for (const p of patientsToSeed) {
            await db.run(
                'INSERT INTO patients (patient_name, age, gender, phone, emergency_contact, blood_group, medical_history) VALUES (?, ?, ?, ?, ?, ?, ?)',
                p
            );
        }
        console.log('Seeded 4 default patients.');

        // Seed active admissions for these patients so they occupy beds
        // Patient 1 in Bed 1 (A-101), Patient 2 in Bed 4 (ICU-01), Patient 3 in Bed 6 (ER-01), Patient 4 in Bed 8 (PED-01)
        const admissionsToSeed = [
            [1, 1, 5, 'NORMAL', 'ACTIVE', 'Routine recovery', 'Patient admitted for follow-up testing'],
            [2, 4, 5, 'EMERGENCY', 'ACTIVE', 'ICU Observation', 'Admitted to ICU for observation'],
            [3, 6, 5, 'EMERGENCY', 'ACTIVE', 'Cardiac warning', 'High blood pressure, monitoring needed'],
            [4, 8, 5, 'NORMAL', 'ACTIVE', 'Pediatric check', 'Admitted for pediatric observation']
        ];
        for (const adm of admissionsToSeed) {
            await db.run(
                `INSERT INTO admissions (patient_id, bed_id, doctor_id, admission_type, admission_status, diagnosis, notes)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                adm
            );
            await db.run(
                'UPDATE beds SET status = "OCCUPIED", patient_id = ? WHERE bed_id = ?',
                [adm[0], adm[1]]
            );
        }
        console.log('Seeded active admissions for default patients.');
    }

    // Now seed the clinical features mock data
    const roundsCount = await db.get('SELECT COUNT(*) as count FROM consultation_rounds');
    const patients = await db.all('SELECT patient_id FROM patients');
    
    if (roundsCount.count === 0 && patients.length >= 3) {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Seed 3 pending rounds for today
        await db.run(`
            INSERT INTO consultation_rounds (patient_id, doctor_id, vitals_bp, vitals_temp, vitals_pulse, vitals_spo2, findings, treatment_plan, next_round, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [patients[0].patient_id, 'Dr Prachi', '120/80', 37.2, 72, 98, 'Patient stable, mild fever', 'Continue antibiotics, monitor temp', `${todayStr} 14:00`, 'Pending']);
        
        await db.run(`
            INSERT INTO consultation_rounds (patient_id, doctor_id, vitals_bp, vitals_temp, vitals_pulse, vitals_spo2, findings, treatment_plan, next_round, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [patients[1].patient_id, 'Dr Prachi', '110/70', 36.8, 68, 99, 'Recovering well', 'Discharge tomorrow if stable', `${todayStr} 16:00`, 'Pending']);
        
        await db.run(`
            INSERT INTO consultation_rounds (patient_id, doctor_id, vitals_bp, vitals_temp, vitals_pulse, vitals_spo2, findings, treatment_plan, next_round, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [patients[2].patient_id, 'Dr Prachi', '140/90', 38.5, 88, 95, 'High BP, fever spiked', 'Increase antipyretics, BP monitoring', `${todayStr} 18:00`, 'Pending']);
        
        console.log('Seeded 3 pending rounds for today.');
    }

    const followupsCount = await db.get('SELECT COUNT(*) as count FROM followups');
    if (followupsCount.count === 0 && patients.length >= 4) {
        await db.run("INSERT INTO followups (patient_id, status, notes, updated_by) VALUES (?, ?, ?, ?)", [patients[0].patient_id, 'Stable', 'Patient responding well to treatment', 'Dr Prachi']);
        await db.run("INSERT INTO followups (patient_id, status, notes, updated_by) VALUES (?, ?, ?, ?)", [patients[1].patient_id, 'Improving', 'Reduced pain levels, mobility increasing', 'Dr Prachi']);
        await db.run("INSERT INTO followups (patient_id, status, notes, updated_by) VALUES (?, ?, ?, ?)", [patients[2].patient_id, 'Critical', 'Requires constant monitoring', 'Dr Prachi']);
        await db.run("INSERT INTO followups (patient_id, status, notes, updated_by) VALUES (?, ?, ?, ?)", [patients[3].patient_id, 'Under Observation', 'Awaiting test results', 'Dr Prachi']);
        console.log('Seeded sample follow-ups.');
    }

    const diagnosisCount = await db.get('SELECT COUNT(*) as count FROM diagnosis');
    if (diagnosisCount.count === 0 && patients.length >= 3) {
        await db.run("INSERT INTO diagnosis (patient_id, primary_diagnosis, secondary_conditions, symptoms, icd10_code, notes, diagnosed_by) VALUES (?, ?, ?, ?, ?, ?, ?)", [patients[0].patient_id, 'Acute Bronchitis', 'Hypertension', 'cough, fever, chest pain', 'J20.9', 'Mild case, outpatient possible', 'Dr Prachi']);
        await db.run("INSERT INTO diagnosis (patient_id, primary_diagnosis, secondary_conditions, symptoms, icd10_code, notes, diagnosed_by) VALUES (?, ?, ?, ?, ?, ?, ?)", [patients[1].patient_id, 'Fractured Tibia', 'None', 'swelling, pain, inability to bear weight', 'S82.201A', 'Surgery scheduled', 'Dr Prachi']);
        await db.run("INSERT INTO diagnosis (patient_id, primary_diagnosis, secondary_conditions, symptoms, icd10_code, notes, diagnosed_by) VALUES (?, ?, ?, ?, ?, ?, ?)", [patients[2].patient_id, 'Pneumonia', 'Diabetes Type 2', 'high fever, difficulty breathing, fatigue', 'J18.9', 'Severe, ICU monitoring required', 'Dr Prachi']);
        console.log('Seeded sample diagnoses.');
    }
};

// ==================== AUTH ROUTES ====================

// Register user (Admin only)
app.post('/auth/register', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password || !role) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const validRoles = ['reception', 'doctor', 'admin'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be reception, doctor, or admin.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await db.run(
            'INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)',
            [name, username, hashedPassword, role]
        );
        res.status(201).json({ message: 'User registered successfully.' });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Username already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

// Login
app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required.' });
    }

    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign(
        { userId: user.user_id, username: user.username, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: '24h' }
    );

    res.json({
        token,
        user: {
            userId: user.user_id,
            name: user.name,
            username: user.username,
            role: user.role
        }
    });
});

// ==================== DOCTORS & USERS ROUTES ====================

app.get('/doctors', authenticateToken, async (req, res) => {
    try {
        const doctors = await db.all(
            'SELECT user_id, name, username FROM users WHERE role = ?',
            ['doctor']
        );
        res.json(doctors.map(d => ({
            doctorId: d.user_id,
            name: d.name,
            username: d.username
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/users', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { role } = req.query;
    let sql = 'SELECT user_id, name, username, role FROM users';
    const params = [];
    
    if (role) {
        sql += ' WHERE role = ?';
        params.push(role);
    }
    
    try {
        const users = await db.all(sql, params);
        res.json(users.map(u => ({
            userId: u.user_id,
            name: u.name,
            username: u.username,
            role: u.role
        })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== WARD ROUTES ====================

app.post('/wards', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { wardName, wardType } = req.body;

    if (!wardName || !wardType) {
        return res.status(400).json({ error: 'Ward name and type are required.' });
    }

    const validTypes = ['general', 'icu', 'emergency', 'pediatric', 'maternity'];
    if (!validTypes.includes(wardType)) {
        return res.status(400).json({ error: 'Invalid ward type.' });
    }

    try {
        await db.run('INSERT INTO wards (ward_name, ward_type) VALUES (?, ?)', [wardName, wardType]);
        res.status(201).json({ message: 'Ward created successfully.' });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Ward name already exists.' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.get('/wards', authenticateToken, async (req, res) => {
    const data = await db.all('SELECT * FROM wards');
    const updatedData = data.map(item => ({
        wardId: item.ward_id,
        wardName: item.ward_name,
        wardType: item.ward_type
    }));
    res.json(updatedData);
});

app.get('/wards/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const data = await db.get('SELECT * FROM wards WHERE ward_id = ?', [id]);
    
    if (!data) {
        return res.status(404).json({ error: 'Ward not found.' });
    }
    
    res.json({
        wardId: data.ward_id,
        wardName: data.ward_name,
        wardType: data.ward_type
    });
});

// ==================== BED ROUTES ====================

app.post('/beds', authenticateToken, requireRole(['admin']), async (req, res) => {
    const { bedNumber, wardId, status } = req.body;

    if (!bedNumber || !wardId) {
        return res.status(400).json({ error: 'Bed number and ward ID are required.' });
    }

    const ward = await db.get('SELECT * FROM wards WHERE ward_id = ?', [wardId]);
    if (!ward) {
        return res.status(404).json({ error: 'Ward not found.' });
    }

    const bedStatus = status || 'AVAILABLE';
    const validStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE'];
    if (!validStatuses.includes(bedStatus)) {
        return res.status(400).json({ error: 'Invalid bed status.' });
    }

    try {
        await db.run(
            'INSERT INTO beds (bed_number, ward_id, status) VALUES (?, ?, ?)',
            [bedNumber, wardId, bedStatus]
        );
        res.status(201).json({ message: 'Bed created successfully.' });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Bed number already exists in this ward.' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.get('/beds', authenticateToken, async (req, res) => {
    const { wardId, status, type } = req.query;
    
    let sql = `
        SELECT 
            b.bed_id, b.bed_number, b.status, b.patient_id,
            w.ward_id, w.ward_name, w.ward_type,
            p.patient_name
        FROM beds b
        INNER JOIN wards w ON b.ward_id = w.ward_id
        LEFT JOIN patients p ON b.patient_id = p.patient_id
        WHERE 1=1
    `;
    const params = [];

    if (wardId) {
        sql += ' AND b.ward_id = ?';
        params.push(wardId);
    }
    if (status) {
        sql += ' AND b.status = ?';
        params.push(status);
    }
    if (type) {
        sql += ' AND w.ward_type = ?';
        params.push(type);
    }

    sql += ' ORDER BY w.ward_name, b.bed_number';

    const data = await db.all(sql, params);
    const updatedData = data.map(item => ({
        bedId: item.bed_id,
        bedNumber: item.bed_number,
        status: item.status,
        wardName: item.ward_name,
        wardType: item.ward_type,
        patientName: item.patient_name || null,
        patientId: item.patient_id
    }));
    
    res.json(updatedData);
});

// Assign bed to patient (Reception/Admin)
app.put('/beds/:id/assign', authenticateToken, requireRole(['reception', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { patientId, doctorId, admissionType, diagnosis, notes } = req.body;

    if (!patientId) {
        return res.status(400).json({ error: 'Patient ID is required.' });
    }

    // Check bed exists and is available
    const bed = await db.get('SELECT * FROM beds WHERE bed_id = ?', [id]);
    if (!bed) {
        return res.status(404).json({ error: 'Bed not found.' });
    }
    if (bed.status === 'OCCUPIED') {
        return res.status(400).json({ error: 'Bed is already occupied.' });
    }

    // Check patient exists and has no active admission
    const patient = await db.get('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
    if (!patient) {
        return res.status(404).json({ error: 'Patient not found.' });
    }

    const activeAdmission = await db.get(
        'SELECT * FROM admissions WHERE patient_id = ? AND admission_status = ?',
        [patientId, 'ACTIVE']
    );
    if (activeAdmission) {
        return res.status(400).json({ error: 'Patient already has an active admission.' });
    }

    // Create admission and update bed in transaction
    try {
        await db.run('BEGIN TRANSACTION');

        // Create admission
        const admissionTypeValue = admissionType || 'NORMAL';
        const result = await db.run(
            `INSERT INTO admissions (patient_id, bed_id, doctor_id, admission_type, diagnosis, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [patientId, id, doctorId || null, admissionTypeValue, diagnosis || null, notes || null]
        );

        // Update bed
        await db.run(
            'UPDATE beds SET status = ?, patient_id = ? WHERE bed_id = ?',
            ['OCCUPIED', patientId, id]
        );

        // Check ICU alert
        if (admissionTypeValue === 'EMERGENCY') {
            await checkICUOccupancy();
        }

        await db.run('COMMIT');
        res.json({ 
            message: 'Bed assigned and patient admitted successfully.',
            admissionId: result.lastID 
        });

    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// Update bed status (for cleaning/maintenance)
app.patch('/beds/:id/status', authenticateToken, requireRole(['admin', 'reception']), async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING', 'MAINTENANCE'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid bed status.' });
    }

    const bed = await db.get('SELECT * FROM beds WHERE bed_id = ?', [id]);
    if (!bed) {
        return res.status(404).json({ error: 'Bed not found.' });
    }

    const patientId = status === 'AVAILABLE' ? null : bed.patient_id;

    await db.run(
        'UPDATE beds SET status = ?, patient_id = ? WHERE bed_id = ?',
        [status, patientId, id]
    );

    res.json({ message: `Bed status updated to ${status}.` });
});

// ==================== PATIENT ROUTES ====================

app.post('/patients', authenticateToken, requireRole(['reception', 'admin']), async (req, res) => {
    const { patientName, age, gender, phone, emergencyContact, bloodGroup, medicalHistory } = req.body;

    if (!patientName || !age || !gender || !phone) {
        return res.status(400).json({ error: 'Patient name, age, gender, and phone are required.' });
    }

    if (age <= 0 || age > 150) {
        return res.status(400).json({ error: 'Invalid age.' });
    }

    try {
        const result = await db.run(
            'INSERT INTO patients (patient_name, age, gender, phone, emergency_contact, blood_group, medical_history) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [patientName, age, gender, phone, emergencyContact || null, bloodGroup || null, medicalHistory || null]
        );
        res.status(201).json({ message: 'Patient registered successfully.', patientId: result.lastID });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(409).json({ error: 'Phone number already registered.' });
        }
        res.status(500).json({ error: err.message });
    }
});

app.get('/patients', authenticateToken, async (req, res) => {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;

    const countRow = await db.get(
        'SELECT COUNT(*) as total FROM patients WHERE patient_name LIKE ?',
        [`%${search}%`]
    );

    const data = await db.all(
        'SELECT * FROM patients WHERE patient_name LIKE ? ORDER BY patient_id DESC LIMIT ? OFFSET ?',
        [`%${search}%`, limit, offset]
    );

    const updatedData = data.map(item => ({
        patientId: item.patient_id,
        patientName: item.patient_name,
        age: item.age,
        gender: item.gender,
        phone: item.phone,
        emergencyContact: item.emergency_contact,
        bloodGroup: item.blood_group
    }));

    res.json({
        data: updatedData,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countRow.total,
            totalPages: Math.ceil(countRow.total / limit)
        }
    });
});

app.get('/patients/:id/history', authenticateToken, async (req, res) => {
    const { id } = req.params;

    const patient = await db.get('SELECT * FROM patients WHERE patient_id = ?', [id]);
    if (!patient) {
        return res.status(404).json({ error: 'Patient not found.' });
    }

    const admissions = await db.all(
        `SELECT 
            a.admission_id, a.admission_type, a.admission_status, a.admitted_at, a.discharge_date,
            a.diagnosis, a.notes,
            b.bed_number, w.ward_name, w.ward_type,
            u.name as doctor_name
        FROM admissions a
        LEFT JOIN beds b ON a.bed_id = b.bed_id
        LEFT JOIN wards w ON b.ward_id = w.ward_id
        LEFT JOIN users u ON a.doctor_id = u.user_id
        WHERE a.patient_id = ?
        ORDER BY a.admitted_at DESC`,
        [id]
    );

    const transfers = await db.all(
        `SELECT 
            pt.transfer_id, pt.transfer_reason, pt.transfer_date,
            fb.bed_number as from_bed, tb.bed_number as to_bed,
            fw.ward_name as from_ward, tw.ward_name as to_ward,
            u.name as transferred_by_name
        FROM patient_transfers pt
        LEFT JOIN beds fb ON pt.from_bed_id = fb.bed_id
        LEFT JOIN beds tb ON pt.to_bed_id = tb.bed_id
        LEFT JOIN wards fw ON pt.from_ward_id = fw.ward_id
        LEFT JOIN wards tw ON pt.to_ward_id = tw.ward_id
        LEFT JOIN users u ON pt.transferred_by = u.user_id
        WHERE pt.admission_id IN (SELECT admission_id FROM admissions WHERE patient_id = ?)
        ORDER BY pt.transfer_date DESC`,
        [id]
    );

    res.json({
        patient: {
            patientId: patient.patient_id,
            patientName: patient.patient_name,
            age: patient.age,
            gender: patient.gender,
            phone: patient.phone,
            bloodGroup: patient.blood_group,
            medicalHistory: patient.medical_history
        },
        admissions: admissions.map(a => ({
            admissionId: a.admission_id,
            bedNumber: a.bed_number,
            wardName: a.ward_name,
            wardType: a.ward_type,
            doctorName: a.doctor_name,
            admissionType: a.admission_type,
            status: a.admission_status,
            admittedAt: a.admitted_at,
            dischargeDate: a.discharge_date,
            diagnosis: a.diagnosis,
            notes: a.notes
        })),
        transfers: transfers.map(t => ({
            transferId: t.transfer_id,
            fromBed: t.from_bed,
            toBed: t.to_bed,
            fromWard: t.from_ward,
            toWard: t.to_ward,
            reason: t.transfer_reason,
            transferredBy: t.transferred_by_name,
            transferDate: t.transfer_date
        }))
    });
});

// ==================== ADMISSION ROUTES ====================

app.post('/admissions', authenticateToken, requireRole(['reception', 'admin']), async (req, res) => {
    const { patientId, bedId, doctorId, admissionType, diagnosis, notes } = req.body;

    if (!patientId || !bedId || !admissionType) {
        return res.status(400).json({ error: 'Patient ID, bed ID, and admission type are required.' });
    }

    const validTypes = ['EMERGENCY', 'NORMAL', 'TRANSFER'];
    if (!validTypes.includes(admissionType)) {
        return res.status(400).json({ error: 'Invalid admission type.' });
    }

    const patient = await db.get('SELECT * FROM patients WHERE patient_id = ?', [patientId]);
    if (!patient) {
        return res.status(404).json({ error: 'Patient not found.' });
    }

    const bed = await db.get('SELECT * FROM beds WHERE bed_id = ? AND status = ?', [bedId, 'AVAILABLE']);
    if (!bed) {
        return res.status(400).json({ error: 'Bed not available or does not exist.' });
    }

    const existingAdmission = await db.get(
        'SELECT * FROM admissions WHERE patient_id = ? AND admission_status = ?',
        [patientId, 'ACTIVE']
    );
    if (existingAdmission) {
        return res.status(400).json({ error: 'Patient already has an active admission.' });
    }

    try {
        await db.run('BEGIN TRANSACTION');

        const result = await db.run(
            `INSERT INTO admissions (patient_id, bed_id, doctor_id, admission_type, diagnosis, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [patientId, bedId, doctorId || null, admissionType, diagnosis || null, notes || null]
        );

        await db.run(
            'UPDATE beds SET status = ?, patient_id = ? WHERE bed_id = ?',
            ['OCCUPIED', patientId, bedId]
        );

        if (admissionType === 'EMERGENCY') {
            await checkICUOccupancy();
        }

        await db.run('COMMIT');
        res.status(201).json({ 
            message: 'Admission created successfully.',
            admissionId: result.lastID 
        });

    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

app.get('/admissions', authenticateToken, async (req, res) => {
    const { status, wardId, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let sql = `
        SELECT 
            a.admission_id, a.admission_type, a.admission_status, a.admitted_at, a.discharge_date,
            a.diagnosis, a.notes,
            p.patient_id, p.patient_name, p.age, p.gender,
            b.bed_id, b.bed_number,
            w.ward_id, w.ward_name, w.ward_type,
            u.name as doctor_name
        FROM admissions a
        INNER JOIN patients p ON a.patient_id = p.patient_id
        INNER JOIN beds b ON a.bed_id = b.bed_id
        INNER JOIN wards w ON b.ward_id = w.ward_id
        LEFT JOIN users u ON a.doctor_id = u.user_id
        WHERE 1=1
    `;
    const params = [];
    let countSql = `
        SELECT COUNT(*) as total
        FROM admissions a
        INNER JOIN patients p ON a.patient_id = p.patient_id
        INNER JOIN beds b ON a.bed_id = b.bed_id
        INNER JOIN wards w ON b.ward_id = w.ward_id
        LEFT JOIN users u ON a.doctor_id = u.user_id
        WHERE 1=1
    `;
    const countParams = [];

    if (status) {
        sql += ' AND a.admission_status = ?';
        countSql += ' AND a.admission_status = ?';
        params.push(status);
        countParams.push(status);
    }
    if (wardId) {
        sql += ' AND w.ward_id = ?';
        countSql += ' AND w.ward_id = ?';
        params.push(wardId);
        countParams.push(wardId);
    }

    const countRow = await db.get(countSql, countParams);

    sql += ' ORDER BY a.admitted_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const data = await db.all(sql, params);

    const updatedData = data.map(item => ({
        admissionId: item.admission_id,
        patientName: item.patient_name,
        patientId: item.patient_id,
        age: item.age,
        gender: item.gender,
        bedNumber: item.bed_number,
        wardName: item.ward_name,
        wardType: item.ward_type,
        doctorName: item.doctor_name,
        admissionType: item.admission_type,
        admissionStatus: item.admission_status,
        admittedAt: item.admitted_at,
        dischargeDate: item.discharge_date,
        diagnosis: item.diagnosis,
        notes: item.notes
    }));

    res.json({
        data: updatedData,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: countRow.total,
            totalPages: Math.ceil(countRow.total / limit)
        }
    });
});

app.put('/admissions/:id/discharge', authenticateToken, requireRole(['doctor', 'admin']), async (req, res) => {
    const { id } = req.params;
    const { dischargeType, finalDiagnosis, dischargeNotes } = req.body;

    const admission = await db.get(
        'SELECT * FROM admissions WHERE admission_id = ? AND admission_status = ?',
        [id, 'ACTIVE']
    );
    if (!admission) {
        return res.status(404).json({ error: 'Active admission not found.' });
    }

    const validDischargeTypes = ['NORMAL', 'AGAINST_ADVICE', 'EXPIRED', 'TRANSFERRED'];
    const dType = dischargeType || 'NORMAL';
    if (!validDischargeTypes.includes(dType)) {
        return res.status(400).json({ error: 'Invalid discharge type.' });
    }

    try {
        await db.run('BEGIN TRANSACTION');

        // Update admission
        await db.run(
            'UPDATE admissions SET admission_status = ?, discharge_date = CURRENT_TIMESTAMP WHERE admission_id = ?',
            ['DISCHARGED', id]
        );

        // Free bed (mark for cleaning)
        await db.run(
            'UPDATE beds SET status = ?, patient_id = NULL WHERE bed_id = ?',
            ['CLEANING', admission.bed_id]
        );

        // Create discharge record
        await db.run(
            `INSERT INTO discharge_records (admission_id, patient_id, discharged_by, discharge_type, final_diagnosis, discharge_notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, admission.patient_id, req.user.userId, dType, finalDiagnosis || null, dischargeNotes || null]
        );

        await db.run('COMMIT');
        res.json({ message: 'Patient discharged successfully. Bed marked for cleaning.' });

    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// ==================== TRANSFER ROUTES ====================

app.post('/transfers', authenticateToken, requireRole(['doctor', 'admin']), async (req, res) => {
    const { admissionId, toBedId, transferReason } = req.body;

    if (!admissionId || !toBedId) {
        return res.status(400).json({ error: 'Admission ID and target bed ID are required.' });
    }

    const admission = await db.get(
        'SELECT * FROM admissions WHERE admission_id = ? AND admission_status = ?',
        [admissionId, 'ACTIVE']
    );
    if (!admission) {
        return res.status(404).json({ error: 'Active admission not found.' });
    }

    const targetBed = await db.get(
        'SELECT * FROM beds WHERE bed_id = ? AND status = ?',
        [toBedId, 'AVAILABLE']
    );
    if (!targetBed) {
        return res.status(400).json({ error: 'Target bed not available.' });
    }

    const fromBed = await db.get('SELECT * FROM beds WHERE bed_id = ?', [admission.bed_id]);

    try {
        await db.run('BEGIN TRANSACTION');

        // Update old bed
        await db.run(
            'UPDATE beds SET status = ?, patient_id = NULL WHERE bed_id = ?',
            ['AVAILABLE', admission.bed_id]
        );

        // Update new bed
        await db.run(
            'UPDATE beds SET status = ?, patient_id = ? WHERE bed_id = ?',
            ['OCCUPIED', admission.patient_id, toBedId]
        );

        // Update admission
        await db.run(
            'UPDATE admissions SET bed_id = ? WHERE admission_id = ?',
            [toBedId, admissionId]
        );

        // Log transfer
        await db.run(
            `INSERT INTO patient_transfers (admission_id, from_bed_id, to_bed_id, from_ward_id, to_ward_id, transfer_reason, transferred_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [admissionId, admission.bed_id, toBedId, fromBed?.ward_id, targetBed.ward_id, transferReason || null, req.user.userId]
        );

        await db.run('COMMIT');
        res.json({ message: 'Patient transferred successfully.' });

    } catch (err) {
        await db.run('ROLLBACK');
        res.status(500).json({ error: err.message });
    }
});

// ==================== DASHBOARD & ANALYTICS ====================

app.get('/dashboard/hospital', authenticateToken, requireRole(['admin']), async (req, res) => {
    // Bed statistics
    const bedStats = await db.get(`
        SELECT 
            COUNT(*) as total_beds,
            SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied_beds,
            SUM(CASE WHEN status = 'AVAILABLE' THEN 1 ELSE 0 END) as available_beds,
            SUM(CASE WHEN status = 'CLEANING' THEN 1 ELSE 0 END) as cleaning_beds,
            SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END) as maintenance_beds,
            SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END) as reserved_beds
        FROM beds
    `);

    const occupancyRate = bedStats.total_beds > 0 
        ? ((bedStats.occupied_beds / bedStats.total_beds) * 100).toFixed(2) 
        : 0;

    // Active admissions
    const activeAdmissions = await db.get(
        'SELECT COUNT(*) as count FROM admissions WHERE admission_status = ?',
        ['ACTIVE']
    );

    // Total patients
    const totalPatients = await db.get('SELECT COUNT(*) as count FROM patients');

    // Today's admissions
    const todayAdmissions = await db.get(
        "SELECT COUNT(*) as count FROM admissions WHERE date(admitted_at) = date('now')"
    );

    // Ward breakdown
    const wardBreakdown = await db.all(`
        SELECT 
            w.ward_name, w.ward_type,
            COUNT(b.bed_id) as total_beds,
            SUM(CASE WHEN b.status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied,
            SUM(CASE WHEN b.status = 'AVAILABLE' THEN 1 ELSE 0 END) as available,
            SUM(CASE WHEN b.status = 'CLEANING' THEN 1 ELSE 0 END) as cleaning
        FROM wards w
        LEFT JOIN beds b ON w.ward_id = b.ward_id
        GROUP BY w.ward_id
        ORDER BY w.ward_name
    `);

    // Recent emergency admissions
    const recentEmergencies = await db.all(`
        SELECT 
            a.admission_id, a.admitted_at, a.diagnosis,
            p.patient_name, p.age,
            b.bed_number, w.ward_name
        FROM admissions a
        JOIN patients p ON a.patient_id = p.patient_id
        JOIN beds b ON a.bed_id = b.bed_id
        JOIN wards w ON b.ward_id = w.ward_id
        WHERE a.admission_type = 'EMERGENCY'
        ORDER BY a.admitted_at DESC LIMIT 5
    `);

    // ICU occupancy check for alert
    const icuStats = await db.get(`
        SELECT 
            COUNT(*) as total_icu,
            SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied_icu
        FROM beds b
        JOIN wards w ON b.ward_id = w.ward_id
        WHERE w.ward_type = 'icu'
    `);

    const icuAlert = icuStats.total_icu > 0 && (icuStats.occupied_icu / icuStats.total_icu) >= 0.9;

    res.json({
        bedStats: {
            total: bedStats.total_beds,
            occupied: bedStats.occupied_beds,
            available: bedStats.available_beds,
            cleaning: bedStats.cleaning_beds,
            maintenance: bedStats.maintenance_beds,
            reserved: bedStats.reserved_beds
        },
        occupancyRate: parseFloat(occupancyRate),
        activeAdmissions: activeAdmissions.count,
        totalPatients: totalPatients.count,
        todayAdmissions: todayAdmissions.count,
        wardBreakdown: wardBreakdown.map(w => ({
            wardName: w.ward_name,
            wardType: w.ward_type,
            totalBeds: w.total_beds,
            occupied: w.occupied,
            available: w.available,
            cleaning: w.cleaning
        })),
        recentEmergencies: recentEmergencies.map(e => ({
            admissionId: e.admission_id,
            patientName: e.patient_name,
            age: e.age,
            bedNumber: e.bed_number,
            wardName: e.ward_name,
            admittedAt: e.admitted_at,
            diagnosis: e.diagnosis
        })),
        icuAlert: icuAlert ? {
            level: 'CRITICAL',
            message: `ICU occupancy at ${((icuStats.occupied_icu / icuStats.total_icu) * 100).toFixed(0)}%`
        } : null
    });
});

// ==================== NOTIFICATIONS ====================

const checkICUOccupancy = async () => {
    const icuStats = await db.get(`
        SELECT 
            COUNT(*) as total_icu,
            SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied_icu
        FROM beds b
        JOIN wards w ON b.ward_id = w.ward_id
        WHERE w.ward_type = 'icu'
    `);

    if (icuStats.total_icu > 0) {
        const rate = icuStats.occupied_icu / icuStats.total_icu;
        if (rate >= 0.9) {
            await db.run(
                'INSERT INTO notifications (type, message) VALUES (?, ?)',
                ['ICU_ALERT', `ICU occupancy critical: ${(rate * 100).toFixed(0)}% full (${icuStats.occupied_icu}/${icuStats.total_icu})`]
            );
        }
    }
};

app.get('/notifications', authenticateToken, async (req, res) => {
    const data = await db.all(
        'SELECT * FROM notifications WHERE is_read = 0 ORDER BY created_at DESC LIMIT 20'
    );
    res.json(data.map(n => ({
        notificationId: n.notification_id,
        type: n.type,
        message: n.message,
        isRead: n.is_read === 1,
        createdAt: n.created_at
    })));
});

app.put('/notifications/:id/read', authenticateToken, async (req, res) => {
    const { id } = req.params;
    await db.run('UPDATE notifications SET is_read = 1 WHERE notification_id = ?', [id]);
    res.json({ message: 'Notification marked as read.' });
});

// ==================== CLINICAL WORKFLOW APIs ====================

// Follow-ups API
// GET /api/followups - Returns all patients with their latest follow-up
app.get('/api/followups', authenticateToken, async (req, res) => {
    const query = `
        SELECT p.patient_id as patientId, p.patient_name as patientName, 
               f.status, f.notes, f.updated_at as updatedAt, f.updated_by as updatedBy
        FROM patients p
        LEFT JOIN (
            SELECT patient_id, status, notes, updated_at, updated_by
            FROM followups
            WHERE id IN (SELECT MAX(id) FROM followups GROUP BY patient_id)
        ) f ON p.patient_id = f.patient_id
        ORDER BY p.patient_id DESC
    `;
    try {
        const data = await db.all(query);
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/followups/:patient_id - All follow-ups for specific patient, ordered updated_at DESC
app.get('/api/followups/:patient_id', authenticateToken, async (req, res) => {
    const { patient_id } = req.params;
    try {
        const data = await db.all(
            'SELECT * FROM followups WHERE patient_id = ? ORDER BY updated_at DESC',
            [patient_id]
        );
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/followups - Insert new follow-up record
app.post('/api/followups', authenticateToken, async (req, res) => {
    const { patient_id, status, notes, updated_by } = req.body;
    if (!patient_id || !status || !updated_by) {
        return res.status(400).json({ error: 'patient_id, status, and updated_by are required.' });
    }
    const validStatuses = ['Stable', 'Improving', 'Critical', 'Under Observation', 'Recovered', 'Referred'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status value.' });
    }
    try {
        const result = await db.run(
            'INSERT INTO followups (patient_id, status, notes, updated_by) VALUES (?, ?, ?, ?)',
            [patient_id, status, notes || null, updated_by]
        );
        res.status(201).json({ message: 'Follow-up updated successfully.', id: result.lastID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/followups/latest/:patient_id - Most recent follow-up only
app.get('/api/followups/latest/:patient_id', authenticateToken, async (req, res) => {
    const { patient_id } = req.params;
    try {
        const data = await db.get(
            'SELECT * FROM followups WHERE patient_id = ? ORDER BY updated_at DESC LIMIT 1',
            [patient_id]
        );
        res.json(data || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/followups/critical/count - Count of patients currently in 'Critical' status
app.get('/api/followups/critical/count', authenticateToken, async (req, res) => {
    const query = `
        SELECT COUNT(*) as count 
        FROM (
            SELECT status
            FROM followups
            WHERE id IN (SELECT MAX(id) FROM followups GROUP BY patient_id)
        )
        WHERE status = 'Critical'
    `;
    try {
        const row = await db.get(query);
        res.json({ count: row.count || 0 });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Diagnosis API
// GET /api/diagnosis/:patient_id - All diagnoses for patient, ordered created_at DESC
app.get('/api/diagnosis/:patient_id', authenticateToken, async (req, res) => {
    const { patient_id } = req.params;
    try {
        const data = await db.all(
            'SELECT * FROM diagnosis WHERE patient_id = ? ORDER BY created_at DESC',
            [patient_id]
        );
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/diagnosis - Insert new diagnosis
app.post('/api/diagnosis', authenticateToken, async (req, res) => {
    const { patient_id, primary_diagnosis, secondary_conditions, symptoms, icd10_code, notes, diagnosed_by } = req.body;
    if (!patient_id || !primary_diagnosis || !diagnosed_by) {
        return res.status(400).json({ error: 'patient_id, primary_diagnosis, and diagnosed_by are required.' });
    }
    try {
        const result = await db.run(
            `INSERT INTO diagnosis (patient_id, primary_diagnosis, secondary_conditions, symptoms, icd10_code, notes, diagnosed_by)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [patient_id, primary_diagnosis, secondary_conditions || null, symptoms || null, icd10_code || null, notes || null, diagnosed_by]
        );
        res.status(201).json({ message: 'Diagnosis recorded successfully.', id: result.lastID });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/diagnosis/latest/:patient_id - Most recent diagnosis only
app.get('/api/diagnosis/latest/:patient_id', authenticateToken, async (req, res) => {
    const { patient_id } = req.params;
    try {
        const data = await db.get(
            'SELECT * FROM diagnosis WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1',
            [patient_id]
        );
        res.json(data || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/patients/:id/detail - Patient details + active bed + admission info
app.get('/api/patients/:id/detail', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const query = `
        SELECT 
            p.patient_id as patientId, 
            p.patient_name as patientName, 
            p.age, 
            p.gender, 
            p.phone as contact, 
            a.admitted_at as admission_date,
            a.admission_id as admissionId,
            b.bed_number, 
            w.ward_type, 
            a.admission_status as status
        FROM patients p
        LEFT JOIN admissions a ON p.patient_id = a.patient_id AND a.admission_status = 'ACTIVE'
        LEFT JOIN beds b ON a.bed_id = b.bed_id
        LEFT JOIN wards w ON b.ward_id = w.ward_id
        WHERE p.patient_id = ?
    `;
    try {
        const data = await db.get(query, [id]);
        if (!data) {
            return res.status(404).json({ error: 'Patient not found.' });
        }
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Consultation Rounds API
// GET /api/rounds - All rounds for logged-in doctor, ordered created_at DESC
app.get('/api/rounds', authenticateToken, async (req, res) => {
    try {
        const data = await db.all(
            `SELECT r.*, p.patient_name as patientName, b.bed_number as bedNumber, w.ward_name as wardName
             FROM consultation_rounds r
             JOIN patients p ON r.patient_id = p.patient_id
             LEFT JOIN admissions a ON p.patient_id = a.patient_id AND a.admission_status = 'ACTIVE'
             LEFT JOIN beds b ON a.bed_id = b.bed_id
             LEFT JOIN wards w ON b.ward_id = w.ward_id
             WHERE r.doctor_id = ? OR r.doctor_id = ?
             ORDER BY r.created_at DESC`,
            [req.user.name, String(req.user.userId)]
        );
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/rounds/today - Rounds scheduled for today for logged-in doctor
app.get('/api/rounds/today', authenticateToken, async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    try {
        const data = await db.all(
            `SELECT r.*, p.patient_name as patientName, b.bed_number as bedNumber, w.ward_name as wardName
             FROM consultation_rounds r
             JOIN patients p ON r.patient_id = p.patient_id
             LEFT JOIN admissions a ON p.patient_id = a.patient_id AND a.admission_status = 'ACTIVE'
             LEFT JOIN beds b ON a.bed_id = b.bed_id
             LEFT JOIN wards w ON b.ward_id = w.ward_id
             WHERE (r.doctor_id = ? OR r.doctor_id = ?) 
               AND (date(r.next_round) = ? OR (r.status = 'Pending' AND date(r.next_round) <= ?))
             ORDER BY r.next_round ASC`,
            [req.user.name, String(req.user.userId), today, today]
        );
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/rounds/patient/:patient_id - All rounds for specific patient
app.get('/api/rounds/patient/:patient_id', authenticateToken, async (req, res) => {
    const { patient_id } = req.params;
    try {
        const data = await db.all(
            'SELECT * FROM consultation_rounds WHERE patient_id = ? ORDER BY created_at DESC',
            [patient_id]
        );
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/rounds - Insert new consultation round
app.post('/api/rounds', authenticateToken, async (req, res) => {
    const { patient_id, vitals_bp, vitals_temp, vitals_pulse, vitals_spo2, findings, treatment_plan, next_round, doctor_id, status } = req.body;
    if (!patient_id || !findings || !doctor_id) {
        return res.status(400).json({ error: 'patient_id, findings, and doctor_id are required.' });
    }
    try {
        // If there was a previous pending round for this patient, mark it as Completed or update it
        const today = new Date().toISOString().split('T')[0];
        const existingPending = await db.get(
            `SELECT id FROM consultation_rounds 
             WHERE patient_id = ? AND status = 'Pending' AND date(next_round) <= ? 
             ORDER BY next_round ASC LIMIT 1`,
            [patient_id, today]
        );
        
        if (existingPending) {
            await db.run(
                `UPDATE consultation_rounds 
                 SET vitals_bp = ?, vitals_temp = ?, vitals_pulse = ?, vitals_spo2 = ?, findings = ?, treatment_plan = ?, next_round = ?, status = 'Completed', doctor_id = ?
                 WHERE id = ?`,
                [vitals_bp || null, vitals_temp || null, vitals_pulse || null, vitals_spo2 || null, findings, treatment_plan || null, next_round || null, doctor_id, existingPending.id]
            );
        } else {
            await db.run(
                `INSERT INTO consultation_rounds (patient_id, doctor_id, vitals_bp, vitals_temp, vitals_pulse, vitals_spo2, findings, treatment_plan, next_round, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [patient_id, doctor_id, vitals_bp || null, vitals_temp || null, vitals_pulse || null, vitals_spo2 || null, findings, treatment_plan || null, next_round || null, status || 'Completed']
            );
        }

        // Automatically schedule the next round by inserting a Pending record if next_round is provided
        if (next_round) {
            await db.run(
                `INSERT INTO consultation_rounds (patient_id, doctor_id, status, next_round)
                 VALUES (?, ?, 'Pending', ?)`,
                [patient_id, doctor_id, next_round]
            );
        }

        res.status(201).json({ message: 'Consultation round recorded successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/rounds/:id/status - Update round status (e.g. Rescheduled)
app.put('/api/rounds/:id/status', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['Completed', 'Pending', 'Rescheduled'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status.' });
    }
    try {
        await db.run(
            'UPDATE consultation_rounds SET status = ? WHERE id = ?',
            [status, id]
        );
        res.json({ message: `Round status updated to ${status}.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==================== ERROR HANDLING ====================

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found.' });
});

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error.' });
});

// ==================== START ====================
initializeServerAndDB();

module.exports = app;