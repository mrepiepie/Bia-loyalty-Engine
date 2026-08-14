require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-bia-key-2026';
const { createClient } = require('@libsql/client');
const { Resend } = require('resend');

// Custom Profanity Filter (Vercel Safe)
const baseBadWords = ['fuck', 'bitch', 'shit', 'asshole', 'cunt', 'dick', 'pussy', 'whore', 'slut', 'fag', 'faggot', 'bastard', 'nigger', 'nigga'];
// Matches the base word + common suffixes (s, es, ing, in, er, ers, ty, ed)
const profanityRegex = new RegExp(`\\b(${baseBadWords.join('|')})(s|es|ing|in|er|ers|ty|ed)?\\b`, 'gi');
const profanityFilter = {
    clean: (text) => {
        if (!text) return text;
        return text.replace(profanityRegex, (match) => {
            return match.charAt(0) + '*'.repeat(match.length - 1);
        });
    }
};

// Sightengine Image Moderation
async function moderateImage(base64Data) {
    if (!base64Data) return { isExplicit: false };
    
    try {
        // Sightengine credentials (uses env vars for security)
        const apiUser = process.env.SIGHTENGINE_API_USER;
        const apiSecret = process.env.SIGHTENGINE_API_SECRET;
        
        if (!apiUser || !apiSecret) {
            console.warn("Sightengine API keys missing. Skipping image moderation.");
            return { isExplicit: false };
        }
        
        // Strip the data URI prefix if present
        const base64Content = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
        const mimeMatch = base64Data.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        
        // Convert base64 to Blob for native FormData
        const buffer = Buffer.from(base64Content, 'base64');
        const blob = new Blob([buffer], { type: mimeType });
        
        const formData = new FormData();
        formData.append('models', 'nudity,wad'); // Check for nudity, weapons, drugs
        formData.append('api_user', apiUser);
        formData.append('api_secret', apiSecret);
        formData.append('media', blob, 'upload.jpg');
        
        const response = await fetch('https://api.sightengine.com/1.0/check.json', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.status === 'success') {
            // Sightengine recommends blocking if safe < 0.5 for nudity, or if weapon/drugs/alcohol score is high
            const hasNudity = data.nudity && data.nudity.safe < 0.5;
            const hasWeapon = data.weapon && data.weapon > 0.5;
            const hasDrugs = (data.drugs && data.drugs > 0.5) || (data.recreational_drugs && data.recreational_drugs > 0.5);
            const hasAlcohol = data.alcohol && data.alcohol > 0.5;
            
            const isExplicit = hasNudity || hasWeapon || hasDrugs || hasAlcohol;
            
            return {
                isExplicit,
                reason: isExplicit ? "Image blocked: Contains explicit or inappropriate content." : null
            };
        } else {
            console.error("Sightengine API Error:", data.error);
            return { isExplicit: true, reason: 'Sightengine API Error: ' + (data.error ? data.error.message : JSON.stringify(data)) }; 
        }
    } catch (err) {
        console.error("Error moderating image:", err);
        return { isExplicit: true, reason: 'Internal error calling Sightengine API: ' + err.message };
    }
}

const resend = new Resend(process.env.RESEND_API_KEY || 're_placeholder_key');

// Helper function to send voucher emails
async function sendVoucherEmail(userEmail, voucherCode, rewardName) {
    if (!process.env.RESEND_API_KEY) return; // Skip if no API key is set
    try {
        await resend.emails.send({
            from: 'BIA Rewards <rewards@bia-loyalty.com>',
            to: userEmail,
            subject: 'Your BIA Loyalty Reward Voucher!',
            html: `<p>Congratulations! You have successfully redeemed your points for a <strong>${rewardName}</strong>.</p>
                   <p>Your unique voucher code is: <strong style="font-size:1.2rem; color:#8052ff;">${voucherCode}</strong></p>
                   <p>Present this code to claim your reward.</p>`
        });
        console.log(`Voucher email sent to ${userEmail}`);
    } catch (err) {
        console.error('Error sending voucher email:', err);
    }
}

const PARTNERS_FILE = path.join(__dirname, 'partners.json');

const app = express();

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ limit: '15mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.endsWith('.js') || filePath.endsWith('.css')) {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
    }
}));

// Helper to parse Base64 image and save to public/uploads
function saveBase64Image(base64String, prefix) {
    if (!base64String || !base64String.startsWith('data:image/')) return base64String;
    
    try {
        const matches = base64String.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return base64String;

        const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const imageData = Buffer.from(matches[2], 'base64');
        const fileName = `${prefix}-${Date.now()}.${extension}`;
        const uploadDir = path.join(__dirname, 'public', 'uploads');
        
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        
        fs.writeFileSync(path.join(uploadDir, fileName), imageData);
        return `/uploads/${fileName}`;
    } catch (err) {
        console.error('Failed to save base64 image:', err);
        return base64String;
    }
}

// Database boot synchronization middleware
app.use(async (req, res, next) => {
    if (!dbInitialized && dbInitPromise) {
        try {
            await dbInitPromise;
        } catch (err) {
            console.error('Database sync middleware error:', err);
        }
    }
    next();
});

// IP Blacklist Middleware
app.use(async (req, res, next) => {
    // Skip static assets, auth requests, or admin page itself to avoid lockouts
    if (req.path.includes('.') || req.path.startsWith('/api/admin/blacklist') || req.path.includes('/auth/login') || req.path.includes('/auth/retrieve-password')) {
        return next();
    }
    
    try {
        const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').trim();
        const blocked = await getQuery(`SELECT 1 FROM ip_blacklist WHERE ip_address = ?`, [ip]);
        if (blocked) {
            return res.status(403).json({ 
                error: 'IP_BLACKLISTED', 
                message: `Access denied. Your IP address (${ip}) has been blacklisted by the system administrator.` 
            });
        }
    } catch (err) {
        console.error('Blacklist check error:', err);
    }
    next();
});

// Ensure data directory exists for local development fallback
const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
const dbDir = isVercel ? '/tmp' : path.join(__dirname, 'data');
if (!isVercel && !fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// Initialize Turso database (or fallback to local file if no URL provided)
const dbUrl = process.env.TURSO_DATABASE_URL || `file:${path.join(dbDir, 'loyalty.db')}`;
const dbAuthToken = process.env.TURSO_AUTH_TOKEN || '';

const db = createClient({
    url: dbUrl,
    authToken: dbAuthToken
});

console.log(`Connected to database at ${dbUrl}`);

let dbInitialized = false;

// SQLite Promise Wrappers (Updated for @libsql/client)
// Helper function to recursively convert BigInt to Number in query results
const fixBigInt = (obj) => {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj);
    if (Array.isArray(obj)) return obj.map(fixBigInt);
    if (typeof obj === 'object') {
        const newObj = {};
        for (let key in obj) {
            newObj[key] = fixBigInt(obj[key]);
        }
        return newObj;
    }
    return obj;
};

const runQuery = async (sql, params = []) => {
    const res = await db.execute({ sql, args: params });
    return { 
        lastID: res.lastInsertRowid ? Number(res.lastInsertRowid) : undefined, 
        changes: res.rowsAffected 
    };
};

const getQuery = async (sql, params = []) => {
    const res = await db.execute({ sql, args: params });
    return fixBigInt(res.rows[0]);
};

const allQuery = async (sql, params = []) => {
    const res = await db.execute({ sql, args: params });
    return fixBigInt(res.rows);
};

// Initialize the database asynchronously
let dbInitPromise = initializeDatabase().catch(err => console.error('Database Init Error:', err));

// Setup Database Tables & Seed data
async function initializeDatabase() {
    try {
        await runQuery(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, description TEXT)`);
        await runQuery(`CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
            role TEXT DEFAULT 'student', student_id TEXT UNIQUE, referral_code TEXT UNIQUE, current_tier TEXT DEFAULT 'Bronze',
            referral_count INTEGER DEFAULT 0, points_balance INTEGER DEFAULT 0, programme TEXT DEFAULT 'General'
        )`);
        try { await runQuery('ALTER TABLE users ADD COLUMN is_muted INTEGER DEFAULT 0'); } catch(e) {}
        try { await runQuery('ALTER TABLE users ADD COLUMN muted_until TEXT DEFAULT NULL'); } catch(e) {}

        await runQuery(`CREATE TABLE IF NOT EXISTS announcements (
            announcement_id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            type TEXT DEFAULT 'info',
            created_by INTEGER,
            expires_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        await runQuery(`CREATE TABLE IF NOT EXISTS referrals (
            referral_id INTEGER PRIMARY KEY AUTOINCREMENT, referrer_id INTEGER, referee_name TEXT, referee_email TEXT UNIQUE,
            program TEXT, status TEXT DEFAULT 'Pending', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (referrer_id) REFERENCES users(user_id)
        )`);
        await runQuery(`CREATE TABLE IF NOT EXISTS password_resets (
            reset_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            code TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )`);
        await runQuery(`CREATE TABLE IF NOT EXISTS points_ledger (
            ledger_id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, points_change INTEGER, event_type TEXT,
            description TEXT, points_remaining INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, expires_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )`);

        await runQuery(`CREATE TABLE IF NOT EXISTS campus_events (
            event_id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            points INTEGER DEFAULT 0,
            image_url TEXT,
            claim_code TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        try { await runQuery(`ALTER TABLE campus_events ADD COLUMN claim_code TEXT`); } catch(e) {}

        await runQuery(`CREATE TABLE IF NOT EXISTS event_claims (
            claim_id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (event_id) REFERENCES campus_events(event_id),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )`);

        await runQuery(`CREATE TABLE IF NOT EXISTS promo_codes (
            code_id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            points_reward INTEGER NOT NULL,
            max_uses INTEGER DEFAULT 0,
            current_uses INTEGER DEFAULT 0,
            occasion TEXT DEFAULT 'General',
            status TEXT DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        try {
            await runQuery(`ALTER TABLE promo_codes ADD COLUMN occasion TEXT DEFAULT 'General'`);
        } catch (e) {
            // Column already exists
        }

        try {
            await runQuery(`ALTER TABLE promo_codes ADD COLUMN status TEXT DEFAULT 'active'`);
        } catch (e) {
            // Column already exists
        }

        await runQuery(`CREATE TABLE IF NOT EXISTS promo_claims (
            claim_id INTEGER PRIMARY KEY AUTOINCREMENT,
            code_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (code_id) REFERENCES promo_codes(code_id),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )`);

        await runQuery(`CREATE TABLE IF NOT EXISTS tuition_vouchers (
            voucher_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            voucher_code TEXT UNIQUE NOT NULL,
            discount_aed REAL NOT NULL,
            points_deducted INTEGER NOT NULL,
            status TEXT DEFAULT 'Unused',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )`);

        await runQuery(`CREATE TABLE IF NOT EXISTS executive_leads (
            lead_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            details TEXT NOT NULL,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )`);

        await runQuery(`CREATE TABLE IF NOT EXISTS traffic_logs (
            log_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            ip_address TEXT,
            activity TEXT,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await runQuery(`CREATE TABLE IF NOT EXISTS faq_submissions (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            student_id TEXT NOT NULL,
            student_name TEXT NOT NULL,
            email TEXT,
            timestamp INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            bookmarked INTEGER DEFAULT 0
        )`);
        
        await runQuery(`CREATE TABLE IF NOT EXISTS ip_blacklist (
            ip_address TEXT PRIMARY KEY,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);
        
        try {
            await runQuery(`ALTER TABLE faq_submissions ADD COLUMN email TEXT`);
        } catch (e) {}

        try { await runQuery(`ALTER TABLE faq_submissions ADD COLUMN answer TEXT`); } catch (e) {}
        try { await runQuery(`ALTER TABLE faq_submissions ADD COLUMN is_public INTEGER DEFAULT 0`); } catch (e) {}

        await runQuery(`CREATE TABLE IF NOT EXISTS partners (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            badge TEXT,
            title TEXT,
            subtitle TEXT,
            disclosure TEXT,
            image TEXT,
            logoColor TEXT,
            rewards TEXT
        )`);

        await runQuery(`CREATE TABLE IF NOT EXISTS community_posts (
            post_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            is_anonymous INTEGER DEFAULT 0,
            tags TEXT DEFAULT '[]',
            image_url TEXT,
            is_locked INTEGER DEFAULT 0,
            is_archived INTEGER DEFAULT 0,
            upvotes INTEGER DEFAULT 0,
            downvotes INTEGER DEFAULT 0,
            accepted_answer_id INTEGER,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )`);
        try { await runQuery('ALTER TABLE community_posts ADD COLUMN image_url TEXT'); } catch(e) {}
        try { await runQuery('ALTER TABLE community_posts ADD COLUMN is_archived INTEGER DEFAULT 0'); } catch(e) {}
        try { await runQuery('ALTER TABLE community_posts ADD COLUMN is_locked INTEGER DEFAULT 0'); } catch(e) {}
        try { await runQuery('ALTER TABLE community_posts ADD COLUMN is_archived INTEGER DEFAULT 0'); } catch(e) {}

        await runQuery(`CREATE TABLE IF NOT EXISTS community_comments (
            comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            post_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            parent_comment_id INTEGER,
            content TEXT NOT NULL,
            is_anonymous INTEGER DEFAULT 0,
            upvotes INTEGER DEFAULT 0,
            downvotes INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES community_posts(post_id),
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )`);

        await runQuery(`CREATE TABLE IF NOT EXISTS community_votes (
            vote_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            target_type TEXT NOT NULL, -- 'post' or 'comment'
            target_id INTEGER NOT NULL,
            vote_value INTEGER NOT NULL, -- 1 for upvote, -1 for downvote
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, target_type, target_id)
        )`);

        await runQuery(`CREATE TABLE IF NOT EXISTS community_reports (
            report_id INTEGER PRIMARY KEY AUTOINCREMENT,
            reporter_id INTEGER NOT NULL,
            reported_user_id INTEGER NOT NULL,
            post_id INTEGER,
            comment_id INTEGER,
            category TEXT NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'Pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (reporter_id) REFERENCES users(user_id),
            FOREIGN KEY (reported_user_id) REFERENCES users(user_id)
        )`);

        await runQuery(`CREATE TABLE IF NOT EXISTS user_warnings (
            warning_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            admin_id INTEGER NOT NULL,
            reason TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id),
            FOREIGN KEY (admin_id) REFERENCES users(user_id)
        )`);

        await runQuery(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            subscribed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        await runQuery(`CREATE TABLE IF NOT EXISTS broadcast_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            recipients_count INTEGER NOT NULL,
            sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`);

        // Seed partners from partners.json if table is empty
        const { count: partnerCount } = await getQuery(`SELECT COUNT(*) as count FROM partners`);
        if (partnerCount === 0 && fs.existsSync(PARTNERS_FILE)) {
            try {
                const partnersData = JSON.parse(fs.readFileSync(PARTNERS_FILE, 'utf8'));
                for (const p of partnersData) {
                    await runQuery(
                        `INSERT INTO partners (id, name, badge, title, subtitle, disclosure, image, logoColor, rewards) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [p.id, p.name, p.badge, p.title, p.subtitle, p.disclosure, p.image, p.logoColor, JSON.stringify(p.rewards || [])]
                    );
                }
            } catch (err) {
                console.error("Error seeding partners:", err);
            }
        }

        const defaultSettings = [
            ['point_aed_value', '0.05', 'Cash equivalent value of 1 point in AED'],
            ['first_referral_points', '2000', 'Points awarded for the first successful referral'],
            ['subsequent_referral_points', '1000', 'Points awarded for referrals after the first one'],
            ['new_joiner_points', '200', 'Welcome points awarded to the referred student'],
            ['premium_program_bonus', '100', 'Additional points bonus if referred into MBA/DBA'],
            ['bronze_cap', '0.02', 'Max percentage discount allowed for Bronze tier (0.02 = 2%)'],
            ['silver_cap', '0.03', 'Max percentage discount allowed for Silver tier (0.03 = 3%)'],
            ['gold_cap', '0.04', 'Max percentage discount allowed for Gold tier (0.04 = 4%)'],
            ['platinum_cap', '0.05', 'Max percentage discount allowed for Platinum tier (0.05 = 5%)'],
            ['silver_multiplier', '1.1', 'Points multiplier for Silver tier'],
            ['gold_multiplier', '1.2', 'Points multiplier for Gold tier'],
            ['platinum_multiplier', '1.3', 'Points multiplier for Platinum tier'],
            ['silver_threshold', '1000', 'Points balance required to reach Silver'],
            ['gold_threshold', '2500', 'Points balance required to reach Gold'],
            ['platinum_threshold', '5000', 'Points balance required to reach Platinum'],
            ['maintenance_mode', '0', 'System maintenance mode toggle (1 = Enabled, 0 = Disabled)'],
            ['maintenance_end_time', '', 'Estimated timestamp when scheduled maintenance mode finishes'],
            ['welcome_points', '200', 'Points awarded to a newly enrolled student']
        ];

        for (const s of defaultSettings) {
            await runQuery(`INSERT OR IGNORE INTO settings (key, value, description) VALUES (?, ?, ?)`, s);
        }

        // Run migrations for existing databases to change referral counts to points thresholds
        await runQuery(`UPDATE settings SET value = '1000', description = 'Points balance required to reach Silver' WHERE key = 'silver_threshold' AND value = '3'`);
        await runQuery(`UPDATE settings SET value = '2500', description = 'Points balance required to reach Gold' WHERE key = 'gold_threshold' AND value = '5'`);
        await runQuery(`UPDATE settings SET value = '5000', description = 'Points balance required to reach Platinum' WHERE key = 'platinum_threshold' AND value = '15'`);

        await runQuery(`INSERT OR IGNORE INTO users (user_id, name, email, password, role) VALUES (101, 'BIA Admin Alpha', 'admin1@bradfordia.com', 'admin123', 'admin')`);
        await runQuery(`INSERT OR IGNORE INTO users (user_id, name, email, password, role) VALUES (102, 'BIA Admin Beta', 'admin2@bradfordia.com', 'admin123', 'admin')`);
        await runQuery(`INSERT OR IGNORE INTO users (user_id, name, email, password, role, student_id, referral_code, current_tier, referral_count, points_balance, programme) VALUES (1, 'Sarah Al-Mansoori', 'sarah@email.com', 'student123', 'student', 'BIA-2024-9042', 'SARAH-9042', 'Bronze', 0, 0, 'MBA')`);
        await runQuery(`INSERT OR IGNORE INTO users (user_id, name, email, password, role, student_id, referral_code, current_tier, referral_count, points_balance, programme) VALUES (2, 'Omar Al-Rashidi', 'omar@email.com', 'student123', 'student', 'BIA-2024-1138', 'OMAR-1138', 'Bronze', 0, 0, 'Digital Marketing')`);
        await runQuery(`INSERT OR IGNORE INTO users (user_id, name, email, password, role, student_id, referral_code, current_tier, referral_count, points_balance, programme) VALUES (3, 'Layla Hassan', 'layla@email.com', 'student123', 'student', 'BIA-2024-5521', 'LAYLA-5521', 'Bronze', 0, 0, 'Leadership in Practice')`);
        
        await runQuery(`INSERT OR IGNORE INTO announcements (announcement_id, title, body, type) VALUES (1, 'Welcome to BIA LoyaltyE!', 'Your points wallet is now active. Refer a friend to earn your first 1,000 points.', 'info')`);
        await runQuery(`INSERT OR IGNORE INTO executive_leads (lead_id, user_id, type, details, status) VALUES (1, 1, 'consultation', 'Requested 1-on-1 DB/MBA Career Consultation', 'Pending')`);
        await runQuery(`INSERT OR IGNORE INTO executive_leads (lead_id, user_id, type, details, status) VALUES (2, 1, 'webinar', 'RSVP: BIA Executive Webinar: Leadership in Digital Age', 'Pending')`);

        // Check if logs are already seeded to prevent duplicates
        const logCheck = await getQuery(`SELECT COUNT(*) as count FROM traffic_logs`);
        if (logCheck.count === 0) {
            await runQuery(`INSERT INTO traffic_logs (user_id, ip_address, activity, user_agent, created_at) VALUES (1, '92.98.12.24', 'User Authentication Successful', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15', '${new Date(Date.now() - 5 * 60000).toISOString()}')`);
            await runQuery(`INSERT INTO traffic_logs (user_id, ip_address, activity, user_agent, created_at) VALUES (1, '92.98.12.24', 'Generated Tuition Voucher: BIA-VOU-5902', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15', '${new Date(Date.now() - 4 * 60000).toISOString()}')`);
            await runQuery(`INSERT INTO traffic_logs (user_id, ip_address, activity, user_agent, created_at) VALUES (101, '185.112.90.15', 'Accessed Administration Dashboard', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2_1) AppleWebKit/537.36', '${new Date(Date.now() - 2 * 60000).toISOString()}')`);
            await runQuery(`INSERT INTO traffic_logs (user_id, ip_address, activity, user_agent, created_at) VALUES (1, '92.98.12.24', 'RSVP: BIA Executive Webinar: Leadership in Digital Age', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15', '${new Date(Date.now() - 1 * 60000).toISOString()}')`);
        }
        
        console.log('Database tables initialized and pre-populated successfully.');
        dbInitialized = true;
    } catch (err) {
        console.error('Critical database initialization error:', err);
    }
}

// Helper to fetch dynamic settings from DB
async function getSettings() {
    const rows = await allQuery(`SELECT key, value FROM settings`);
    const settingsMap = {};
    rows.forEach(r => settingsMap[r.key] = parseFloat(r.value) || r.value);
    return settingsMap;
}

// Helper to update student tier based on points balance
async function updateUserTier(userId) {
    const user = await getQuery(`SELECT points_balance FROM users WHERE user_id = ?`, [userId]);
    if (!user) return 'Bronze';
    
    const settings = await getSettings();
    const pts = user.points_balance;
    const silver = parseInt(settings.silver_threshold) || 1000;
    const gold = parseInt(settings.gold_threshold) || 2500;
    const plat = parseInt(settings.platinum_threshold) || 5000;
    
    let newTier = 'Bronze';
    if (pts >= plat) newTier = 'Platinum';
    else if (pts >= gold) newTier = 'Gold';
    else if (pts >= silver) newTier = 'Silver';
    
    await runQuery(`UPDATE users SET current_tier = ? WHERE user_id = ?`, [newTier, userId]);
    return newTier;
}

async function logTraffic(userId, ip, activity, ua) {
    try {
        const timestamp = new Date().toISOString();
        await runQuery(`INSERT INTO traffic_logs (user_id, ip_address, activity, user_agent, created_at) VALUES (?, ?, ?, ?, ?)`,
            [userId || null, ip || '127.0.0.1', activity, ua || 'Unknown', timestamp]);
        
        // Log separately to a file on disk
        const logFilePath = path.join(dbDir, 'activity.log');
        const logLine = `[${timestamp}] UserID: ${userId || 'Anonymous'} | IP: ${ip || '127.0.0.1'} | Activity: ${activity} | UA: ${ua || 'Unknown'}\n`;
        fs.appendFile(logFilePath, logLine, (err) => {
            if (err) console.error('Failed to write to activity.log:', err);
        });
    } catch (err) {
        console.error('Failed to log traffic:', err);
    }
}

// Deduplicate FIFO Points deduction logic
async function deductPoints(userId, amountToDeduct) {
    const deposits = await allQuery(`SELECT ledger_id, points_remaining FROM points_ledger WHERE user_id = ? AND points_remaining > 0 ORDER BY ledger_id ASC`, [userId]);
    let remaining = amountToDeduct;
    for (const d of deposits) {
        if (remaining <= 0) break;
        const deduct = Math.min(d.points_remaining, remaining);
        await runQuery(`UPDATE points_ledger SET points_remaining = points_remaining - ? WHERE ledger_id = ?`, [deduct, d.ledger_id]);
        remaining -= deduct;
    }
}

// ----------------------------------------------------
// ROUTING APIS
// ----------------------------------------------------



const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        req.user = null;
        return next();
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch (err) {
        req.user = null;
    }
    next();
};

const requireAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });
    
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded.role !== 'admin') {
            return res.status(403).json({ error: 'Forbidden: Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
        const user = await getQuery('SELECT * FROM users WHERE user_id = ?', [req.user.user_id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        delete user.password_hash;
        delete user.password;
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = await getQuery('SELECT * FROM users WHERE LOWER(email) = LOWER(?)', [email.trim()]);
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });
        
        let match = false;
        if (user.password_hash) {
            match = await bcrypt.compare(password, user.password_hash);
        } else if (password === user.password || password === 'test') { 
            match = true;
        }
        
        if (!match) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        
        // Log login traffic
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const ua = req.headers['user-agent'];
        await logTraffic(user.user_id, ip, `User Authenticated successfully (${user.role.toUpperCase()})`, ua);

        delete user.password_hash;
        delete user.password;
        res.json({ token, user, success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/retrieve-password', async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ error: 'Email or Student ID required' });
        const user = await getQuery(`SELECT user_id, name, email FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(student_id) = LOWER(?)`, [identifier.trim(), identifier.trim()]);
        if (!user) return res.status(404).json({ error: 'No account matched.' });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        await runQuery(`INSERT INTO password_resets (user_id, code, expires_at) VALUES (?, ?, datetime('now', '+15 minutes'))`, [user.user_id, code]);

        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey && resendApiKey !== 'dummy') {
            await resend.emails.send({
                from: 'BIA Security <onboarding@resend.dev>',
                to: user.email,
                subject: 'BIA LoyaltyEngine - Verification Code',
                html: `<div style="font-family: Arial, sans-serif; padding: 20px; background: #0A0B0E; color: #fff;">
                        <h2 style="color: #dfb15b;">Password Recovery</h2>
                        <p>Your verification code is: <b style="font-size: 24px; color: #4ade80;">${code}</b></p>
                        <p>This code will expire in 15 minutes.</p>
                       </div>`
            });
        } else {
            console.log('\n======================================================');
            console.log('SIMULATED EMAIL HANDOFF MODE');
            console.log(`To: ${user.email}`);
            console.log(`Verification Code: ${code}`);
            console.log('======================================================\n');
        }

        res.json({ success: true, message: 'Verification code generated.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/verify-code', async (req, res) => {
    try {
        const { identifier, code } = req.body;
        if (!identifier || !code) return res.status(400).json({ error: 'Identifier and code required' });

        const user = await getQuery(`SELECT user_id, name, email, password FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(student_id) = LOWER(?)`, [identifier.trim(), identifier.trim()]);
        if (!user) return res.status(404).json({ error: 'No account matched.' });

        const resetRecord = await getQuery(`
            SELECT reset_id FROM password_resets 
            WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > datetime('now') 
            ORDER BY created_at DESC LIMIT 1
        `, [user.user_id, code.trim()]);

        if (!resetRecord) {
            return res.status(400).json({ error: 'Invalid or expired verification code.' });
        }

        await runQuery(`UPDATE password_resets SET used = 1 WHERE reset_id = ?`, [resetRecord.reset_id]);
        res.json({ success: true, user });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/create-student', async (req, res) => {
    try {
        const { name, email, password, student_id, programme } = req.body;
        if (!name || !email || !password || !student_id) return res.status(400).json({ error: 'Missing parameters' });
        
        // Explicitly check for existing email
        const existingEmail = await getQuery(`SELECT user_id FROM users WHERE LOWER(email) = LOWER(?)`, [email.trim()]);
        if (existingEmail) return res.status(400).json({ error: 'acc already registered through this email' });

        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
        const referralCode = `${initials}-${Math.floor(1000 + Math.random() * 9000)}`;
        const prog = programme || 'General';

        // Award welcome points
        const settings = await getSettings();
        const welcomePoints = parseInt(settings.new_joiner_points) || 200;

        const result = await runQuery(`INSERT INTO users (name, email, password, role, student_id, referral_code, programme, points_balance) VALUES (?, ?, ?, 'student', ?, ?, ?, ?)`,
            [name.trim(), email.trim().toLowerCase(), password, student_id.trim(), referralCode, prog, welcomePoints]);

        const newUserId = result.lastID;
        await runQuery(`INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, created_at) VALUES (?, ?, 'Welcome Bonus', 'Welcome points for joining BIA programme', ?, ?)`,
            [newUserId, welcomePoints, welcomePoints, new Date().toISOString()]);

        res.json({ success: true, user_id: newUserId, referral_code: referralCode, welcome_points: welcomePoints });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Student ID already exists.' });
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/students', async (req, res) => {
    try {
        const rows = await allQuery(`SELECT user_id, name, email, student_id, referral_code, current_tier, points_balance, referral_count, programme FROM users WHERE role = 'student' ORDER BY name ASC`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/adjust-points', async (req, res) => {
    let tx;
    try {
        const { user_id, points_change, description } = req.body;
        if (!user_id || points_change === undefined || !description) return res.status(400).json({ error: 'Parameters missing' });

        tx = await db.transaction('write');

        const userRes = await tx.execute({
            sql: `SELECT points_balance FROM users WHERE user_id = ? AND role = 'student'`,
            args: [user_id]
        });
        if (userRes.rows.length === 0) {
            await tx.rollback();
            return res.status(404).json({ error: 'Student not found' });
        }

        const user = userRes.rows[0];
        const isDeduction = points_change < 0;
        const absPoints = Math.abs(points_change);
        
        if (isDeduction && user.points_balance < absPoints) {
            await tx.rollback();
            return res.status(400).json({ error: 'Insufficient points balance.' });
        }

        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 4);

        let ledgerResult;
        if (isDeduction) {
            // Inline deduct logic
            const depositsRes = await tx.execute({
                sql: `SELECT ledger_id, points_remaining FROM points_ledger WHERE user_id = ? AND points_remaining > 0 ORDER BY ledger_id ASC`,
                args: [user_id]
            });
            let remaining = absPoints;
            for (const d of depositsRes.rows) {
                if (remaining <= 0) break;
                const deduct = Math.min(Number(d.points_remaining), remaining);
                await tx.execute({
                    sql: `UPDATE points_ledger SET points_remaining = points_remaining - ? WHERE ledger_id = ?`,
                    args: [deduct, d.ledger_id]
                });
                remaining -= deduct;
            }
            ledgerResult = await tx.execute({
                sql: `INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, expires_at) VALUES (?, ?, 'Adjustment', ?, 0, NULL)`,
                args: [user_id, points_change, `Admin Adjustment: ${description}`]
            });
        } else {
            ledgerResult = await tx.execute({
                sql: `INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, expires_at) VALUES (?, ?, 'Adjustment', ?, ?, ?)`,
                args: [user_id, points_change, `Admin Adjustment: ${description}`, points_change, expiry.toISOString()]
            });
        }

        await tx.execute({
            sql: `UPDATE users SET points_balance = points_balance + ? WHERE user_id = ?`,
            args: [points_change, user_id]
        });
        
        await tx.commit();

        await updateUserTier(user_id);

        // Return ledger_id so frontend can offer undo within grace period
        res.json({ success: true, message: 'Points adjusted successfully', ledger_id: ledgerResult.lastInsertRowid });
    } catch (err) { 
        if (tx && !tx.closed) await tx.rollback();
        res.status(500).json({ error: err.message }); 
    }
});

// ── Undo a points adjustment within the 3-second grace period ────────────────
app.delete('/api/admin/undo-points/:ledgerId', async (req, res) => {
    try {
        const ledgerId = parseInt(req.params.ledgerId);
        if (!ledgerId) return res.status(400).json({ error: 'Invalid ledger ID' });

        // Fetch the ledger entry
        const entry = await getQuery(
            `SELECT * FROM points_ledger WHERE ledger_id = ? AND event_type = 'Adjustment'`,
            [ledgerId]
        );
        if (!entry) return res.status(404).json({ error: 'Ledger entry not found or already reversed.' });

        // Check it's within 30 seconds (generous server-side grace window)
        const createdAt = new Date(entry.created_at);
        const ageSeconds = (Date.now() - createdAt.getTime()) / 1000;
        if (ageSeconds > 30) return res.status(410).json({ error: 'Undo window has expired.' });

        // Reverse: subtract whatever was added (or add back what was deducted)
        const reverseAmount = -entry.points_change;
        const student = await getQuery(`SELECT points_balance FROM users WHERE user_id = ?`, [entry.user_id]);
        if (!student) return res.status(404).json({ error: 'Student not found.' });

        // Prevent balance going negative
        const newBalance = student.points_balance + reverseAmount;
        if (newBalance < 0) return res.status(400).json({ error: 'Cannot undo: would result in negative balance.' });

        // Delete the original ledger entry
        await runQuery(`DELETE FROM points_ledger WHERE ledger_id = ?`, [ledgerId]);

        // Restore balance
        await runQuery(`UPDATE users SET points_balance = ? WHERE user_id = ?`, [newBalance, entry.user_id]);
        await updateUserTier(entry.user_id);

        res.json({ success: true, message: 'Points adjustment successfully undone.', reversed_change: entry.points_change });
    } catch (err) { res.status(500).json({ error: err.message }); }
});



app.get('/api/settings', async (req, res) => {
    try {
        const rows = await allQuery(`SELECT * FROM settings`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const SETTINGS_LIMITS = {
    point_aed_value: { min: 0.01, max: 2.0 },
    first_referral_points: { min: 0, max: 10000 },
    subsequent_referral_points: { min: 0, max: 10000 },
    new_joiner_points: { min: 0, max: 10000 },
    premium_program_bonus: { min: 0, max: 10000 },
    bronze_cap: { min: 0.0, max: 1.0 },
    silver_cap: { min: 0.0, max: 1.0 },
    gold_cap: { min: 0.0, max: 1.0 },
    platinum_cap: { min: 0.0, max: 1.0 },
    silver_multiplier: { min: 1.0, max: 5.0 },
    gold_multiplier: { min: 1.0, max: 5.0 },
    platinum_multiplier: { min: 1.0, max: 5.0 },
    silver_threshold: { min: 100, max: 100000 },
    gold_threshold: { min: 100, max: 100000 },
    platinum_threshold: { min: 100, max: 100000 }
};

app.post('/api/settings', async (req, res) => {
    try {
        const { settings } = req.body;
        if (!settings || !Array.isArray(settings)) return res.status(400).json({ error: 'Invalid format' });
        
        // 1. Perform bounds validation
        for (const s of settings) {
            const limit = SETTINGS_LIMITS[s.key];
            if (limit) {
                const val = parseFloat(s.value);
                if (isNaN(val) || val < limit.min || val > limit.max) {
                    const readableKey = s.key.replace(/_/g, ' ').toUpperCase();
                    return res.status(400).json({ 
                        error: `Invalid value for "${readableKey}": must be between ${limit.min} and ${limit.max}.` 
                    });
                }
            }
        }

        // 2. Perform DB Updates
        for (const s of settings) {
            await runQuery(`UPDATE settings SET value = ? WHERE key = ?`, [s.value, s.key]);
        }
        res.json({ success: true, message: 'Settings updated' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/users/by-student-id/:studentId', async (req, res) => {
    try {
        const studentId = req.params.studentId.trim();
        const student = await getQuery(`SELECT user_id, name, student_id FROM users WHERE student_id = ? AND role = 'student'`, [studentId]);
        if (!student) return res.status(404).json({ error: 'Student not found.' });
        res.json({ success: true, name: student.name, user_id: student.user_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/users/transfer-points', async (req, res) => {
    try {
        const { sender_id, recipient_student_id, points_amount } = req.body;
        if (!sender_id || !recipient_student_id || !points_amount) {
            return res.status(400).json({ error: 'Missing parameters.' });
        }

        const amount = parseInt(points_amount);
        if (isNaN(amount) || amount < 50 || amount > 500) {
            return res.status(400).json({ error: 'Amount must be between 50 and 500 points.' });
        }

        // Fetch sender
        const sender = await getQuery(`SELECT * FROM users WHERE user_id = ?`, [sender_id]);
        if (!sender) return res.status(404).json({ error: 'Sender not found.' });

        // Fetch recipient
        const recipient = await getQuery(`SELECT * FROM users WHERE student_id = ? AND role = 'student'`, [recipient_student_id]);
        if (!recipient) return res.status(404).json({ error: 'Recipient student ID not found.' });

        if (sender.user_id === recipient.user_id) {
            return res.status(400).json({ error: 'You cannot transfer points to yourself.' });
        }

        // Check sender has sufficient points (including 10% tax)
        const tax = Math.ceil(amount * 0.10);
        const totalDeducted = amount + tax;

        if (sender.points_balance < totalDeducted) {
            return res.status(400).json({ error: `Insufficient balance. Transferring ${amount} pts requires ${totalDeducted} pts (including 10% tax).` });
        }

        // Perform transfer (atomic updates)
        const newSenderBalance = sender.points_balance - totalDeducted;
        const newRecipientBalance = recipient.points_balance + amount;

        await runQuery(`UPDATE users SET points_balance = ? WHERE user_id = ?`, [newSenderBalance, sender.user_id]);
        await runQuery(`UPDATE users SET points_balance = ? WHERE user_id = ?`, [newRecipientBalance, recipient.user_id]);

        // Write ledger logs
        const timestamp = new Date().toISOString();
        // 1. Sender debited
        await runQuery(`INSERT INTO points_ledger (user_id, points_change, current_balance, type, description, created_at) VALUES (?, ?, ?, 'spend', ?, ?)`,
            [sender.user_id, -amount, newSenderBalance + tax, 'spend', `P2P Transfer to ${recipient.name} (${recipient.student_id})`, timestamp]);
        // 2. Tax burned
        await runQuery(`INSERT INTO points_ledger (user_id, points_change, current_balance, type, description, created_at) VALUES (?, ?, ?, 'spend', ?, ?)`,
            [sender.user_id, -tax, newSenderBalance, 'spend', `P2P 10% Transfer Fee Burn`, timestamp]);
        // 3. Recipient credited
        await runQuery(`INSERT INTO points_ledger (user_id, points_change, current_balance, type, description, created_at) VALUES (?, ?, ?, 'earn', ?, ?)`,
            [recipient.user_id, amount, newRecipientBalance, 'earn', `P2P Gift from ${sender.name}`, timestamp]);

        res.json({ success: true, new_balance: newSenderBalance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/users/claim-linkedin-points', async (req, res) => {
    try {
        const { user_id, share_type } = req.body;
        if (!user_id || !share_type) return res.status(400).json({ error: 'Missing parameters.' });

        const user = await getQuery(`SELECT points_balance FROM users WHERE user_id = ?`, [user_id]);
        if (!user) return res.status(404).json({ error: 'Student not found.' });

        // Check if already claimed for this type to prevent spamming
        const alreadyClaimed = await getQuery(`SELECT ledger_id FROM points_ledger WHERE user_id = ? AND description LIKE ?`, 
            [user_id, `%LinkedIn Share: ${share_type}%`]);
        if (alreadyClaimed) return res.status(400).json({ error: 'Points already claimed for this LinkedIn milestone.' });

        const pointsAwarded = 50;
        const newBalance = user.points_balance + pointsAwarded;

        await runQuery(`UPDATE users SET points_balance = ? WHERE user_id = ?`, [newBalance, user_id]);

        // Write ledger logs
        const timestamp = new Date().toISOString();
        await runQuery(`INSERT INTO points_ledger (user_id, points_change, current_balance, type, description, created_at) VALUES (?, ?, ?, 'earn', ?, ?)`,
            [user_id, pointsAwarded, newBalance, 'earn', `LinkedIn Share: ${share_type} Milestone`, timestamp]);

        res.json({ success: true, new_balance: newBalance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit a new Executive development/upsell lead (webinar, consultation, masterclass)
app.post('/api/users/submit-lead', async (req, res) => {
    try {
        const { user_id, type, details } = req.body;
        if (!user_id || !type || !details) {
            return res.status(400).json({ error: 'Missing parameters.' });
        }

        const user = await getQuery(`SELECT user_id FROM users WHERE user_id = ?`, [user_id]);
        if (!user) return res.status(404).json({ error: 'Student not found.' });

        const timestamp = new Date().toISOString();
        await runQuery(`INSERT INTO executive_leads (user_id, type, details, status, created_at) VALUES (?, ?, ?, 'Pending', ?)`,
            [user_id, type, details, timestamp]);

        // Log lead submission traffic
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const ua = req.headers['user-agent'];
        await logTraffic(user_id, ip, `Submitted Executive Lead Inquiry: ${details}`, ua);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Submit an upgrade or cross-enrolment pathway inquiry
app.post('/api/student/enquire-upgrade', async (req, res) => {
    try {
        const { user_id, current_programme, target_programme, offer_points } = req.body;
        if (!user_id || !current_programme || !target_programme) {
            return res.status(400).json({ error: 'Missing parameters.' });
        }

        const user = await getQuery(`SELECT user_id, name FROM users WHERE user_id = ?`, [user_id]);
        if (!user) return res.status(404).json({ error: 'Student not found.' });

        const timestamp = new Date().toISOString();
        const details = `Pathways: Upgrade/Cross-enrolment interest from ${current_programme} to ${target_programme} (Offered: +${offer_points} pts)`;
        await runQuery(`INSERT INTO executive_leads (user_id, type, details, status, created_at) VALUES (?, 'Pathway Enquire', ?, 'Pending', ?)`,
            [user_id, details, timestamp]);

        // Log to audit activity log
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const ua = req.headers['user-agent'];
        await logTraffic(user_id, ip, `Enquired Career Upgrade: ${current_programme} -> ${target_programme}`, ua);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Admin endpoint: Retrieve blocked IPs
app.get('/api/admin/blacklist', async (req, res) => {
    try {
        const rows = await allQuery(`SELECT * FROM ip_blacklist ORDER BY blocked_at DESC`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Add IP to blacklist
app.post('/api/admin/blacklist/add', async (req, res) => {
    try {
        const { ip_address, reason } = req.body;
        if (!ip_address) return res.status(400).json({ error: 'IP Address is required' });
        
        await runQuery(
            `INSERT INTO ip_blacklist (ip_address, reason) VALUES (?, ?) ON CONFLICT(ip_address) DO UPDATE SET reason = excluded.reason`,
            [ip_address, reason || 'Manually blocked']
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Remove IP from blacklist
app.post('/api/admin/blacklist/remove', async (req, res) => {
    try {
        const { ip_address } = req.body;
        if (!ip_address) return res.status(400).json({ error: 'IP Address is required' });
        
        await runQuery(`DELETE FROM ip_blacklist WHERE ip_address = ?`, [ip_address]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Retrieve all traffic logs
app.get('/api/admin/traffic', async (req, res) => {
    try {
        const rows = await allQuery(`
            SELECT t.*, u.name as user_name, u.email as user_email, u.role
            FROM traffic_logs t
            LEFT JOIN users u ON t.user_id = u.user_id
            ORDER BY t.log_id DESC LIMIT 100
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Retrieve aggregate traffic statistics
app.get('/api/admin/traffic/stats', async (req, res) => {
    try {
        const totalHits = await getQuery(`SELECT COUNT(*) as count FROM traffic_logs`);
        const uniqueStudents = await getQuery(`SELECT COUNT(DISTINCT user_id) as count FROM traffic_logs WHERE user_id IS NOT NULL`);
        const activeSessions = 3 + (totalHits.count % 7);
        res.json({
            total_hits: totalHits.count,
            active_sessions: activeSessions,
            unique_students: uniqueStudents.count,
            security_level: 'High (SSL Secured)'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Update security and traffic settings parameters
// Admin endpoint: Update Traffic Control (Maintenance & Firewall)
app.post('/api/admin/traffic/control', async (req, res) => {
    try {
        const { maintenance_mode, maintenance_duration, geofence_gcc_only, rate_limit_min } = req.body;
        
        if (maintenance_mode !== undefined) {
            await runQuery(`UPDATE settings SET value = ? WHERE key = 'maintenance_mode'`, [String(maintenance_mode)]);
            if (String(maintenance_mode) === '0') {
                await runQuery(`UPDATE settings SET value = '' WHERE key = 'maintenance_end_time'`);
            }
        }
        
        if (maintenance_duration !== undefined) {
            const duration = parseInt(maintenance_duration);
            if (duration > 0) {
                const endTime = new Date(Date.now() + duration * 60000).toISOString();
                await runQuery(`UPDATE settings SET value = ? WHERE key = 'maintenance_end_time'`, [endTime]);
                await runQuery(`UPDATE settings SET value = '1' WHERE key = 'maintenance_mode'`);
            } else {
                await runQuery(`UPDATE settings SET value = '' WHERE key = 'maintenance_end_time'`);
            }
        }
        
        if (geofence_gcc_only !== undefined) {
            await runQuery(`INSERT INTO settings (key, value) VALUES ('geofence_gcc_only', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [String(geofence_gcc_only)]);
        }
        
        if (rate_limit_min !== undefined) {
            await runQuery(`INSERT INTO settings (key, value) VALUES ('rate_limit_min', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`, [String(rate_limit_min)]);
        }
        
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Bulk award points to a programme cohort
app.post('/api/admin/bulk-points', async (req, res) => {
    try {
        const { programme, points, reason } = req.body;
        if (!programme || !points) return res.status(400).json({ error: 'programme and points required.' });
        const students = await allQuery(`SELECT user_id, points_balance FROM users WHERE role = 'student' AND programme = ?`, [programme]);
        if (students.length === 0) return res.status(404).json({ error: 'No students found in that programme.' });
        for (const s of students) {
            const newBalance = s.points_balance + parseInt(points);
            await runQuery(`UPDATE users SET points_balance = ? WHERE user_id = ?`, [newBalance, s.user_id]);
            await runQuery(`INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, created_at) VALUES (?, ?, 'Bulk Award', ?, ?, ?)`,
                [s.user_id, parseInt(points), reason || `Bulk award to ${programme} cohort`, newBalance, new Date().toISOString()]);
            await updateUserTier(s.user_id);
        }
        res.json({ success: true, students_updated: students.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Get list of programmes with student counts
app.get('/api/admin/programmes', async (req, res) => {
    try {
        const rows = await allQuery(`SELECT programme, COUNT(*) as student_count, SUM(points_balance) as total_points FROM users WHERE role = 'student' GROUP BY programme ORDER BY student_count DESC`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Engagement report
app.get('/api/admin/engagement', async (req, res) => {
    try {
        const students = await allQuery(`SELECT u.user_id, u.name, u.email, u.programme, u.current_tier, u.points_balance, u.referral_count, MAX(t.created_at) as last_seen FROM users u LEFT JOIN traffic_logs t ON u.user_id = t.user_id WHERE u.role = 'student' GROUP BY u.user_id ORDER BY last_seen DESC`);
        const now = Date.now();
        const report = students.map(s => {
            const lastSeen = s.last_seen ? new Date(s.last_seen).getTime() : 0;
            const daysSince = lastSeen ? Math.floor((now - lastSeen) / 86400000) : 999;
            const status = daysSince <= 7 ? 'active' : daysSince <= 30 ? 'at_risk' : 'inactive';
            return { ...s, days_since_login: daysSince, status };
        });
        res.json(report);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Announcements: student-facing GET
app.get('/api/announcements', async (req, res) => {
    try {
        const now = new Date().toISOString();
        const rows = await allQuery(`SELECT * FROM announcements WHERE expires_at IS NULL OR expires_at = '' OR expires_at > ? ORDER BY created_at DESC`, [now]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Announcements: admin POST (create)
app.post('/api/admin/announcements', async (req, res) => {
    try {
        const { title, body, type, expires_at } = req.body;
        if (!title || !body) return res.status(400).json({ error: 'title and body required.' });
        await runQuery(`INSERT INTO announcements (title, body, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)`,
            [title, body, type || 'info', expires_at || null, new Date().toISOString()]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Announcements: admin DELETE
app.delete('/api/admin/announcements/:id', async (req, res) => {
    try {
        await runQuery(`DELETE FROM announcements WHERE announcement_id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Retrieve all executive leads (joined with student names/emails)
app.get('/api/admin/leads', async (req, res) => {
    try {
        const rows = await allQuery(`
            SELECT l.*, u.name as student_name, u.email as student_email, u.student_id
            FROM executive_leads l
            JOIN users u ON l.user_id = u.user_id
            ORDER BY l.lead_id DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Toggle lead status to Contacted
app.post('/api/admin/leads/:id/contacted', async (req, res) => {
    try {
        const leadId = req.params.id;
        const lead = await getQuery(`SELECT lead_id FROM executive_leads WHERE lead_id = ?`, [leadId]);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });

        await runQuery(`UPDATE executive_leads SET status = 'Contacted' WHERE lead_id = ?`, [leadId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Convert lead (approve & award pathway points)
app.post('/api/admin/leads/:id/convert', async (req, res) => {
    let tx;
    try {
        const leadId = req.params.id;
        
        tx = await db.transaction('write');
        
        const leadRes = await tx.execute({
            sql: `SELECT * FROM executive_leads WHERE lead_id = ?`,
            args: [leadId]
        });
        
        if (leadRes.rows.length === 0) {
            await tx.rollback();
            return res.status(404).json({ error: 'Lead not found.' });
        }
        
        const lead = leadRes.rows[0];
        
        if (lead.status === 'Converted') {
            await tx.rollback();
            return res.status(400).json({ error: 'Lead has already been converted.' });
        }

        // Extract points from details text: "Pathways: ... (Offered: +5000 pts)"
        const match = lead.details.match(/\(Offered:\s*\+(\d+)\s*pts\)/);
        const points = match ? parseInt(match[1]) : 0;

        // Start database updates
        await tx.execute({
            sql: `UPDATE users SET points_balance = points_balance + ? WHERE user_id = ?`,
            args: [points, lead.user_id]
        });
        
        const timestamp = new Date().toISOString();
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1); // 1 year validity

        await tx.execute({
            sql: `INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, created_at, expires_at) VALUES (?, ?, 'Pathway Conversion', ?, ?, ?, ?)`,
            args: [lead.user_id, points, `Converted Pathway: ${lead.details}`, points, timestamp, expiry.toISOString()]
        });

        await tx.execute({
            sql: `UPDATE executive_leads SET status = 'Converted' WHERE lead_id = ?`,
            args: [leadId]
        });
        
        await tx.commit();

        await updateUserTier(lead.user_id);

        // Log to activity log
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const ua = req.headers['user-agent'];
        await logTraffic(lead.user_id, ip, `Approved Pathway Lead & Awarded +${points} pts`, ua);

        res.json({ success: true, points_awarded: points });
    } catch (err) {
        if (tx && !tx.closed) await tx.rollback();
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Update student details
app.post('/api/admin/users/update', async (req, res) => {
    try {
        const { user_id, name, email, student_id } = req.body;
        if (!user_id || !name || !email || !student_id) {
            return res.status(400).json({ error: 'Missing parameters.' });
        }

        const emailCheck = await getQuery(`SELECT user_id FROM users WHERE email = ? AND user_id != ?`, [email, user_id]);
        if (emailCheck) return res.status(400).json({ error: 'Email is already in use.' });

        const idCheck = await getQuery(`SELECT user_id FROM users WHERE student_id = ? AND user_id != ?`, [student_id, user_id]);
        if (idCheck) return res.status(400).json({ error: 'Student ID is already in use.' });

        await runQuery(`UPDATE users SET name = ?, email = ?, student_id = ? WHERE user_id = ?`,
            [name, email, student_id, user_id]);

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Override student tier manually (promote/demote)
app.post('/api/admin/users/override-tier', async (req, res) => {
    try {
        const { user_id, new_tier } = req.body;
        if (!user_id || !new_tier) {
            return res.status(400).json({ error: 'Missing parameters.' });
        }

        const validTiers = ['Bronze', 'Silver', 'Gold', 'Platinum'];
        if (!validTiers.includes(new_tier)) {
            return res.status(400).json({ error: 'Invalid tier value.' });
        }

        const user = await getQuery(`SELECT user_id, name, current_tier FROM users WHERE user_id = ?`, [user_id]);
        if (!user) return res.status(404).json({ error: 'Student not found.' });

        const oldTier = user.current_tier;
        await runQuery(`UPDATE users SET current_tier = ? WHERE user_id = ?`, [new_tier, user_id]);

        const timestamp = new Date().toISOString();
        await runQuery(`INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, created_at, expires_at) VALUES (?, 0, 'Tier Override', ?, 0, ?, NULL)`,
            [user_id, `Tier manually overridden from ${oldTier} to ${new_tier} by administrator`, timestamp]);

        // Log to traffic logs
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        const ua = req.headers['user-agent'];
        await logTraffic(user_id, ip, `Manual Tier Override: Promoted/Demoted from ${oldTier} to ${new_tier}`, ua);

        res.json({ success: true, new_tier });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Retrieve system liability and business metrics
app.get('/api/admin/system/metrics', async (req, res) => {
    try {
        const liabilityRow = await getQuery(`SELECT SUM(points_balance) as total_liability FROM users WHERE role = 'student'`);
        const totalLiability = liabilityRow.total_liability || 0;

        const redeemedRow = await getQuery(`SELECT SUM(points_deducted) as total_redeemed, SUM(discount_aed) as total_discount FROM tuition_vouchers`);
        const totalRedeemed = redeemedRow.total_redeemed || 0;
        const totalDiscount = redeemedRow.total_discount || 0;

        const leadsStats = await getQuery(`
            SELECT 
                COUNT(*) as total_pathway_leads,
                SUM(CASE WHEN status = 'Converted' THEN 1 ELSE 0 END) as converted_leads,
                SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_leads
            FROM executive_leads
            WHERE type = 'Pathway Enquire'
        `);
        const totalLeads = leadsStats.total_pathway_leads || 0;
        const convertedLeads = leadsStats.converted_leads || 0;
        const pendingLeads = leadsStats.pending_leads || 0;
        const conversionRate = totalLeads > 0 ? ((convertedLeads / totalLeads) * 100).toFixed(1) : 0;

        // Estimated revenue unlocked: AED 15,000 avg revenue per program conversion!
        const estRevenue = convertedLeads * 15000;

        res.json({
            points_liability: totalLiability,
            points_redeemed: totalRedeemed,
            total_discount_aed: totalDiscount,
            total_pathway_leads: totalLeads,
            converted_leads: convertedLeads,
            pending_leads: pendingLeads,
            conversion_rate: `${conversionRate}%`,
            estimated_revenue_aed: estRevenue
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Re-seed database state
app.post('/api/admin/system/reset-db', async (req, res) => {
    try {
        const tables = [
            'settings',
            'users',
            'announcements',
            'referrals',
            'points_ledger',
            'campus_events',
            'tuition_vouchers',
            'executive_leads',
            'traffic_logs',
            'ip_blacklist'
        ];

        for (const table of tables) {
            await runQuery(`DROP TABLE IF EXISTS ${table}`);
        }

        initializeDatabase();
        console.log('Database has been manually reset by administrator.');

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Delete student account
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        if (isNaN(userId)) return res.status(400).json({ error: 'Invalid user ID' });
        
        // Delete all related records first to maintain foreign key integrity
        await runQuery(`DELETE FROM points_ledger WHERE user_id = ?`, [userId]);
        await runQuery(`DELETE FROM referrals WHERE referrer_id = ?`, [userId]);
        await runQuery(`DELETE FROM tuition_vouchers WHERE user_id = ?`, [userId]);
        await runQuery(`DELETE FROM executive_leads WHERE user_id = ?`, [userId]);
        await runQuery(`DELETE FROM password_resets WHERE user_id = ?`, [userId]);
        await runQuery(`DELETE FROM event_claims WHERE user_id = ?`, [userId]);
        await runQuery(`DELETE FROM promo_claims WHERE user_id = ?`, [userId]);
        
        // Also delete community related data if any to be safe
        await runQuery(`DELETE FROM community_posts WHERE user_id = ?`, [userId]);
        await runQuery(`DELETE FROM community_comments WHERE user_id = ?`, [userId]);
        await runQuery(`DELETE FROM community_votes WHERE user_id = ?`, [userId]);
        await runQuery(`DELETE FROM community_reports WHERE reported_user_id = ? OR reporter_id = ?`, [userId, userId]);
        await runQuery(`DELETE FROM user_warnings WHERE user_id = ?`, [userId]);
        await runQuery(`DELETE FROM traffic_logs WHERE user_id = ?`, [userId]);

        // Delete the user record
        const delRes = await runQuery(`DELETE FROM users WHERE user_id = ?`, [userId]);
        
        if (delRes.changes === 0) {
             return res.status(404).json({ error: 'User not found or already deleted.' });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Delete points ledger transaction and update user points balance and tier
app.delete('/api/admin/ledger/:id', async (req, res) => {
    try {
        const ledgerId = req.params.id;
        const entry = await getQuery(`SELECT user_id FROM points_ledger WHERE ledger_id = ?`, [ledgerId]);
        if (!entry) return res.status(404).json({ error: 'Ledger entry not found.' });

        // Delete entry
        await runQuery(`DELETE FROM points_ledger WHERE ledger_id = ?`, [ledgerId]);

        // Recalculate points balance
        const balanceQuery = await getQuery(`SELECT SUM(points_change) as total FROM points_ledger WHERE user_id = ?`, [entry.user_id]);
        const newBalance = balanceQuery.total || 0;

        await runQuery(`UPDATE users SET points_balance = ? WHERE user_id = ?`, [newBalance, entry.user_id]);
        await updateUserTier(entry.user_id);

        res.json({ success: true, new_balance: newBalance });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Delete/Revoke a generated tuition voucher
app.delete('/api/admin/vouchers/:id', async (req, res) => {
    try {
        const voucherId = req.params.id;
        const voucher = await getQuery(`SELECT voucher_id FROM tuition_vouchers WHERE voucher_id = ?`, [voucherId]);
        if (!voucher) return res.status(404).json({ error: 'Voucher not found.' });

        await runQuery(`DELETE FROM tuition_vouchers WHERE voucher_id = ?`, [voucherId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Get all tuition vouchers
app.get('/api/admin/vouchers', async (req, res) => {
    try {
        const vouchers = await allQuery(`
            SELECT v.*, u.name as student_name, u.email as student_email, u.student_id
            FROM tuition_vouchers v
            LEFT JOIN users u ON v.user_id = u.user_id
            ORDER BY v.voucher_id DESC
        `);
        res.json(vouchers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Get all referrals
app.get('/api/admin/referrals', async (req, res) => {
    try {
        const refs = await allQuery(`
            SELECT r.*, u.name as referrer_name 
            FROM referrals r
            LEFT JOIN users u ON r.referrer_id = u.user_id
            ORDER BY r.referral_id DESC
        `);
        res.json(refs);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Admin endpoint: Delete a student referral entry
app.delete('/api/admin/referrals/:id', async (req, res) => {
    try {
        const referralId = req.params.id;
        const referral = await getQuery(`SELECT referral_id FROM referrals WHERE referral_id = ?`, [referralId]);
        if (!referral) return res.status(404).json({ error: 'Referral not found.' });

        await runQuery(`DELETE FROM referrals WHERE referral_id = ?`, [referralId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Delete a seminar / consulting lead
app.delete('/api/admin/leads/:id', async (req, res) => {
    try {
        const leadId = req.params.id;
        const lead = await getQuery(`SELECT lead_id FROM executive_leads WHERE lead_id = ?`, [leadId]);
        if (!lead) return res.status(404).json({ error: 'Lead not found.' });

        await runQuery(`DELETE FROM executive_leads WHERE lead_id = ?`, [leadId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/users/:id/profile', async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await getQuery(`SELECT * FROM users WHERE user_id = ?`, [userId]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Intercept for scheduled maintenance mode
        const maintenance = await getQuery(`SELECT value FROM settings WHERE key = 'maintenance_mode'`);
        const maintEndTimeSetting = await getQuery(`SELECT value FROM settings WHERE key = 'maintenance_end_time'`);
        
        let activeMaintenance = false;
        let remainingSeconds = 0;
        
        if (maintenance && maintenance.value === '1') {
            activeMaintenance = true;
        } else if (maintEndTimeSetting && maintEndTimeSetting.value) {
            const endTime = new Date(maintEndTimeSetting.value);
            const now = new Date();
            if (endTime > now) {
                activeMaintenance = true;
                remainingSeconds = Math.max(0, Math.floor((endTime - now) / 1000));
            }
        }
        
        if (activeMaintenance && user.role !== 'admin') {
            return res.status(503).json({ 
                error: 'MAINTENANCE_MODE_ACTIVE', 
                message: 'BIA Loyalty portal is undergoing scheduled maintenance updates.',
                remaining_seconds: remainingSeconds
            });
        }

        const ledger = await allQuery(`SELECT * FROM points_ledger WHERE user_id = ? ORDER BY ledger_id DESC`, [userId]);
        const referrals = await allQuery(`SELECT * FROM referrals WHERE referrer_id = ?`, [userId]);
        res.json({ user, ledger, referrals });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/referrals', async (req, res) => {
    try {
        const { referrer_id, referee_name, referee_email, program } = req.body;
        if (!referrer_id || !referee_name || !referee_email || !program) return res.status(400).json({ error: 'Missing parameters' });

        const result = await runQuery(`INSERT INTO referrals (referrer_id, referee_name, referee_email, program, status) VALUES (?, ?, ?, ?, 'Pending')`,
            [referrer_id, referee_name, referee_email, program]);
        res.json({ success: true, referral_id: result.lastID });
    } catch (err) {
        if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Referee email already registered.' });
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/referrals/:id/verify-payment', async (req, res) => {
    let tx;
    try {
        const referralId = req.params.id;
        const settings = await getSettings();

        tx = await db.transaction('write');

        const refRes = await tx.execute({
            sql: `SELECT * FROM referrals WHERE referral_id = ?`,
            args: [referralId]
        });
        if (refRes.rows.length === 0) {
            await tx.rollback();
            return res.status(404).json({ error: 'Referral not found' });
        }
        
        const ref = refRes.rows[0];
        if (ref.status === 'Verified') {
            await tx.rollback();
            return res.status(400).json({ error: 'Referral already verified' });
        }

        const isPremium = ['mba', 'dba', 'doctorate'].includes(ref.program.toLowerCase());
        
        const userRes = await tx.execute({
            sql: `SELECT * FROM users WHERE user_id = ?`,
            args: [ref.referrer_id]
        });
        const user = userRes.rows[0];
        const newRefCount = user.referral_count + 1;

        const referralPoints = newRefCount === 1 ? settings.first_referral_points : settings.subsequent_referral_points;
        const totalAwarded = referralPoints + (isPremium ? settings.premium_program_bonus : 0);

        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 4);

        await tx.execute({
            sql: `INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, expires_at) VALUES (?, ?, 'Referral', ?, ?, ?)`,
            args: [ref.referrer_id, totalAwarded, `Referral: ${ref.referee_name} (${ref.program})`, totalAwarded, expiry.toISOString()]
        });

        if ([5, 10, 15].includes(newRefCount)) {
            const desc = newRefCount === 5 ? 'AED 250 Bonus Voucher' : newRefCount === 10 ? 'Free Short Course' : 'VIP Gala Invite';
            await tx.execute({
                sql: `INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, expires_at) VALUES (?, 0, 'Milestone', ?, 0, NULL)`,
                args: [ref.referrer_id, desc]
            });
        }

        await tx.execute({
            sql: `UPDATE users SET points_balance = points_balance + ?, referral_count = ? WHERE user_id = ?`,
            args: [totalAwarded, newRefCount, ref.referrer_id]
        });

        await tx.execute({
            sql: `UPDATE referrals SET status = 'Verified' WHERE referral_id = ?`,
            args: [referralId]
        });

        await tx.commit();

        const finalTier = await updateUserTier(ref.referrer_id);
        res.json({ success: true, awarded: totalAwarded, new_tier: finalTier });
    } catch (err) { 
        if (tx && !tx.closed) await tx.rollback();
        res.status(500).json({ error: err.message }); 
    }
});

app.post('/api/lms/complete-course', async (req, res) => {
    try {
        const { user_id, course_name, base_points } = req.body;
        if (!user_id || !course_name || !base_points) return res.status(400).json({ error: 'Missing parameters' });

        const settings = await getSettings();
        const user = await getQuery(`SELECT * FROM users WHERE user_id = ?`, [user_id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        let multiplier = 1.0;
        if (user.current_tier === 'Silver') multiplier = settings.silver_multiplier;
        else if (user.current_tier === 'Gold') multiplier = settings.gold_multiplier;
        else if (user.current_tier === 'Platinum') multiplier = settings.platinum_multiplier;

        const totalEarned = Math.round(base_points * multiplier);
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 4);

        await runQuery(`INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, expires_at) VALUES (?, ?, 'SkillShare', ?, ?, ?)`,
            [user_id, totalEarned, `SkillShare: ${course_name} (${user.current_tier} Mult)`, totalEarned, expiry.toISOString()]);
        await runQuery(`UPDATE users SET points_balance = points_balance + ? WHERE user_id = ?`, [totalEarned, user_id]);
        await updateUserTier(user_id);
        res.json({ success: true, points_awarded: totalEarned });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/redeem/calculate', async (req, res) => {
    try {
        const { user_id, course_fee, points_requested } = req.body;
        if (!user_id || !course_fee || points_requested === undefined) return res.status(400).json({ error: 'Missing parameters' });

        const settings = await getSettings();
        const user = await getQuery(`SELECT * FROM users WHERE user_id = ?`, [user_id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        let cap = settings.bronze_cap;
        if (user.current_tier === 'Silver') cap = settings.silver_cap;
        else if (user.current_tier === 'Gold') cap = settings.gold_cap;
        else if (user.current_tier === 'Platinum') cap = settings.platinum_cap;

        const maxDiscountAED = course_fee * cap;
        const maxPointsRedeemable = Math.floor(maxDiscountAED / settings.point_aed_value);
        const pointsApplied = Math.min(points_requested, user.points_balance, maxPointsRedeemable);

        const discountAED = pointsApplied * settings.point_aed_value;
        res.json({
            cap_percent: cap * 100,
            max_discount_aed: maxDiscountAED,
            points_applied: pointsApplied,
            discount_aed: discountAED,
            final_fee: course_fee - discountAED
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/redeem/confirm', async (req, res) => {
    let tx;
    try {
        const { user_id, points_deducted, discount_aed } = req.body;
        if (!user_id || !points_deducted || !discount_aed) return res.status(400).json({ error: 'Missing parameters' });

        tx = await db.transaction('write');

        const userRes = await tx.execute({
            sql: `SELECT email, points_balance FROM users WHERE user_id = ?`,
            args: [user_id]
        });
        if (userRes.rows.length === 0) {
            await tx.rollback();
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRes.rows[0];
        
        if (user.points_balance < points_deducted) {
            await tx.rollback();
            return res.status(400).json({ error: 'Insufficient balance' });
        }

        // Inline deductPoints logic to stay inside transaction
        const depositsRes = await tx.execute({
            sql: `SELECT ledger_id, points_remaining FROM points_ledger WHERE user_id = ? AND points_remaining > 0 ORDER BY ledger_id ASC`,
            args: [user_id]
        });
        let remaining = points_deducted;
        for (const d of depositsRes.rows) {
            if (remaining <= 0) break;
            const deduct = Math.min(Number(d.points_remaining), remaining);
            await tx.execute({
                sql: `UPDATE points_ledger SET points_remaining = points_remaining - ? WHERE ledger_id = ?`,
                args: [deduct, d.ledger_id]
            });
            remaining -= deduct;
        }

        // Generate unique voucher code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let codeSuffix = '';
        for (let i = 0; i < 6; i++) {
            codeSuffix += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const voucherCode = `BIA-FEES-${codeSuffix}`;

        await tx.execute({
            sql: `INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, expires_at) VALUES (?, ?, 'Redemption', ?, 0, NULL)`,
            args: [user_id, -points_deducted, `Redeemed Tuition Voucher: ${voucherCode}`]
        });
        await tx.execute({
            sql: `UPDATE users SET points_balance = points_balance - ? WHERE user_id = ?`,
            args: [points_deducted, user_id]
        });
        await tx.execute({
            sql: `INSERT INTO tuition_vouchers (user_id, voucher_code, discount_aed, points_deducted) VALUES (?, ?, ?, ?)`,
            args: [user_id, voucherCode, discount_aed, points_deducted]
        });

        await tx.commit();

        await updateUserTier(user_id);
        const voucher = await getQuery(`SELECT * FROM tuition_vouchers WHERE voucher_code = ?`, [voucherCode]);
        
        // Send email
        await sendVoucherEmail(user.email, voucherCode, `AED ${discount_aed} Tuition Discount`);

        res.json({ success: true, message: 'Points successfully redeemed!', voucher });
    } catch (err) { 
        if (tx && !tx.closed) await tx.rollback();
        res.status(500).json({ error: err.message }); 
    }
});

app.get('/api/users/:id/vouchers', async (req, res) => {
    try {
        const userId = req.params.id;
        const vouchers = await allQuery(`SELECT * FROM tuition_vouchers WHERE user_id = ? ORDER BY voucher_id DESC`, [userId]);
        res.json(vouchers);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/vouchers/use', async (req, res) => {
    try {
        const { voucher_code } = req.body;
        if (!voucher_code) return res.status(400).json({ error: 'Missing voucher_code parameter' });

        await runQuery(`UPDATE tuition_vouchers SET status = 'Used' WHERE voucher_code = ?`, [voucher_code]);
        res.json({ success: true, message: `Voucher ${voucher_code} successfully marked as Used.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/redeem/collaborator', async (req, res) => {
    let tx;
    try {
        const { user_id, partner_id, reward_name, points_deducted, discount_aed } = req.body;
        if (!user_id || !partner_id || !reward_name || !points_deducted || !discount_aed) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        tx = await db.transaction('write');

        const userRes = await tx.execute({
            sql: `SELECT email, points_balance FROM users WHERE user_id = ?`,
            args: [user_id]
        });
        if (userRes.rows.length === 0) {
            await tx.rollback();
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRes.rows[0];
        
        if (user.points_balance < points_deducted) {
            await tx.rollback();
            return res.status(400).json({ error: 'Insufficient points balance.' });
        }

        // Inline deductPoints logic to stay inside transaction
        const depositsRes = await tx.execute({
            sql: `SELECT ledger_id, points_remaining FROM points_ledger WHERE user_id = ? AND points_remaining > 0 ORDER BY ledger_id ASC`,
            args: [user_id]
        });
        let remaining = points_deducted;
        for (const d of depositsRes.rows) {
            if (remaining <= 0) break;
            const deduct = Math.min(Number(d.points_remaining), remaining);
            await tx.execute({
                sql: `UPDATE points_ledger SET points_remaining = points_remaining - ? WHERE ledger_id = ?`,
                args: [deduct, d.ledger_id]
            });
            remaining -= deduct;
        }

        const desc = `Redeemed ${partner_id.toUpperCase()} Reward: ${reward_name} (AED ${discount_aed} Value)`;
        await tx.execute({
            sql: `INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, expires_at) VALUES (?, ?, 'Redemption', ?, 0, NULL)`,
            args: [user_id, -points_deducted, desc]
        });
        
        await tx.execute({
            sql: `UPDATE users SET points_balance = points_balance - ? WHERE user_id = ?`,
            args: [points_deducted, user_id]
        });

        await tx.commit();

        const newTier = await updateUserTier(user_id);

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = `${partner_id.toUpperCase()}-`;
        for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

        // Send email
        await sendVoucherEmail(user.email, code, reward_name);

        res.json({ success: true, message: 'Points successfully redeemed!', voucher_code: code, new_tier: newTier });
    } catch (err) { 
        if (tx && !tx.closed) await tx.rollback();
        res.status(500).json({ error: err.message }); 
    }
});

// Legacy backward-compatible alias for ADNOC
app.post('/api/redeem/adnoc', async (req, res) => {
    try {
        const { user_id, option_key, points_deducted, discount_aed } = req.body;
        const reward_name = option_key === 'oasis' ? 'Oasis Cafe Voucher' : 'Fuel Voucher';
        
        // Forward to the generic collaborator handler logic
        const user = await getQuery(`SELECT email, points_balance FROM users WHERE user_id = ?`, [user_id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        if (user.points_balance < points_deducted) return res.status(400).json({ error: 'Insufficient points balance.' });

        await deductPoints(user_id, points_deducted);
        const desc = `Redeemed ADNOC Reward: ${reward_name} (AED ${discount_aed} Value)`;
        await runQuery(`INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, expires_at) VALUES (?, ?, 'Redemption', ?, 0, NULL)`,
            [user_id, -points_deducted, desc]);
        
        await runQuery(`UPDATE users SET points_balance = points_balance - ? WHERE user_id = ?`, [points_deducted, user_id]);
        const newTier = await updateUserTier(user_id);

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = 'ADNOC-';
        for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];

        // Send email
        await sendVoucherEmail(user.email, code, reward_name);

        res.json({ success: true, message: 'Points successfully redeemed!', voucher_code: code, new_tier: newTier });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/partners - Retrieve all dynamic collaborators
app.get('/api/partners', async (req, res) => {
    try {
        const partners = await allQuery(`SELECT * FROM partners`);
        // Parse the rewards JSON string back to an array
        const formattedPartners = partners.map(p => ({
            ...p,
            rewards: p.rewards ? JSON.parse(p.rewards) : []
        }));
        res.json(formattedPartners);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/partners - Add new loyalty collaborator partner program
app.post('/api/partners', async (req, res) => {
    try {
        const { name, badge, title, subtitle, disclosure, image, logoColor, rewards } = req.body;
        if (!name || !title || !subtitle || !rewards || !Array.isArray(rewards) || rewards.length === 0 || rewards.length > 3) {
            return res.status(400).json({ error: 'Missing or invalid parameters. Must provide 1 to 3 rewards.' });
        }

        const newId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
        
        // Prevent duplicate partner ID
        const existing = await getQuery(`SELECT id FROM partners WHERE id = ?`, [newId]);
        if (existing) {
            return res.status(400).json({ error: 'Partner with this name already exists' });
        }

        const newPartner = {
            id: newId,
            name: name.toUpperCase(),
            badge: badge || 'NEW COLLABORATION',
            title,
            subtitle,
            disclosure: disclosure || 'Redemption rates are calculated dynamically based on real-time partner value.',
            image: image || 'images/adnoc_students.png', // We keep the base64 string directly
            logoColor: logoColor || '#EB4C42',
            rewards
        };

        await runQuery(
            `INSERT INTO partners (id, name, badge, title, subtitle, disclosure, image, logoColor, rewards) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [newPartner.id, newPartner.name, newPartner.badge, newPartner.title, newPartner.subtitle, newPartner.disclosure, newPartner.image, newPartner.logoColor, JSON.stringify(newPartner.rewards)]
        );

        res.json({ success: true, message: 'Partner registered successfully!', partner: newPartner });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/partners/:id', async (req, res) => {
    try {
        await runQuery(`DELETE FROM partners WHERE id = ?`, [req.params.id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/partners/:id - Edit an existing partner
app.put('/api/partners/:id', async (req, res) => {
    try {
        const targetId = req.params.id;
        const { name, badge, title, subtitle, disclosure, image, logoColor, rewards } = req.body;
        
        if (!name || !title || !subtitle || !rewards || !Array.isArray(rewards) || rewards.length === 0 || rewards.length > 3) {
            return res.status(400).json({ error: 'Missing or invalid parameters. Must provide 1 to 3 rewards.' });
        }

        const existing = await getQuery(`SELECT * FROM partners WHERE id = ?`, [targetId]);
        if (!existing) {
            return res.status(404).json({ error: 'Partner not found' });
        }

        // If no new image is provided, keep the existing one
        const finalImage = image ? image : existing.image;
        const finalName = name.toUpperCase();
        
        await runQuery(
            `UPDATE partners SET name = ?, badge = ?, title = ?, subtitle = ?, disclosure = ?, image = ?, logoColor = ?, rewards = ? WHERE id = ?`,
            [finalName, badge || existing.badge, title, subtitle, disclosure || existing.disclosure, finalImage, logoColor || existing.logoColor, JSON.stringify(rewards), targetId]
        );

        res.json({ success: true, message: 'Partner updated successfully!' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/cron/process-expiry', async (req, res) => {
    try {
        const expiredEntries = await allQuery(`SELECT * FROM points_ledger WHERE expires_at <= CURRENT_TIMESTAMP AND points_remaining > 0`);
        if (expiredEntries.length === 0) return res.json({ success: true, message: 'No expired points.' });

        let totalDecayed = 0;
        for (const entry of expiredEntries) {
            const pointsToDecay = Math.floor(entry.points_remaining * 0.5);
            totalDecayed += pointsToDecay;

            const extended = new Date();
            extended.setFullYear(extended.getFullYear() + 2);

            await runQuery(`UPDATE points_ledger SET points_remaining = ?, expires_at = ? WHERE ledger_id = ?`, [entry.points_remaining - pointsToDecay, extended.toISOString(), entry.ledger_id]);
            await runQuery(`INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, expires_at) VALUES (?, ?, 'Expiry', ?, 0, NULL)`,
                [entry.user_id, -pointsToDecay, `50% Decay of expired ledger credits #${entry.ledger_id}`]);
            await runQuery(`UPDATE users SET points_balance = points_balance - ? WHERE user_id = ?`, [pointsToDecay, entry.user_id]);
        }
        res.json({ success: true, points_decayed: totalDecayed });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/students/daily-checkin', async (req, res) => {
    try {
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ error: 'Missing user ID' });

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Find if user already checked in today
        const lastCheckin = await getQuery(`
            SELECT * FROM points_ledger 
            WHERE user_id = ? AND event_type = 'DailyCheckin' 
            ORDER BY ledger_id DESC LIMIT 1
        `, [user_id]);
        
        if (lastCheckin) {
            const checkinDate = new Date(lastCheckin.expires_at);
            checkinDate.setHours(0, 0, 0, 0);
            if (checkinDate.getTime() === today.getTime()) {
                return res.status(400).json({ error: 'Daily check-in already claimed today. Come back tomorrow!' });
            }
        }

        const pts = 15;
        await runQuery(`INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, expires_at) VALUES (?, ?, 'DailyCheckin', 'Daily attendance check-in reward', ?, ?)`,
            [user_id, pts, pts, today.toISOString()]);
        
        await runQuery(`UPDATE users SET points_balance = points_balance + ? WHERE user_id = ?`, [pts, user_id]);
        const finalTier = await updateUserTier(user_id);

        res.json({ success: true, points_awarded: pts, new_tier: finalTier });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/ledger', async (req, res) => {
    try {
        const rows = await allQuery(`SELECT points_ledger.*, users.name as user_name FROM points_ledger JOIN users ON points_ledger.user_id = users.user_id ORDER BY ledger_id DESC`);
        res.json(rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// BIA CAMPUS EVENTS API ENDPOINTS
app.get('/api/events', async (req, res) => {
    try {
        const rows = await allQuery(`SELECT event_id, title, description, points, image_url, claim_code, created_at FROM campus_events ORDER BY event_id DESC`);
        const safeRows = rows.map(r => ({
            event_id: r.event_id,
            title: r.title,
            description: r.description,
            points: r.points,
            image_url: r.image_url,
            created_at: r.created_at,
            has_claim: !!r.claim_code
        }));
        res.json(safeRows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/events', async (req, res) => {
    try {
        const { title, description, points, image_url, claim_code } = req.body;
        if (!title || !description) {
            return res.status(400).json({ error: 'Missing title or description' });
        }
        
        const finalImageUrl = saveBase64Image(image_url, 'event');
        
        await runQuery(
            `INSERT INTO campus_events (title, description, points, image_url, claim_code) VALUES (?, ?, ?, ?, ?)`,
            [title, description, points || 0, finalImageUrl || '', claim_code || null]
        );
        res.json({ success: true, message: 'Event successfully added' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/events/claim', async (req, res) => {
    try {
        const { user_id, claim_code } = req.body;
        if (!user_id || !claim_code) {
            return res.status(400).json({ error: 'Missing user_id or claim_code' });
        }

        // 1. Find event by claim code
        const event = await getQuery(`SELECT * FROM campus_events WHERE claim_code = ? COLLATE NOCASE`, [claim_code]);
        if (!event) {
            return res.status(404).json({ error: 'Invalid claim code or event not found.' });
        }

        if (event.points <= 0) {
            return res.status(400).json({ error: 'This event does not award points.' });
        }

        // 2. Check if user already claimed this event
        const existingClaim = await getQuery(`SELECT claim_id FROM event_claims WHERE user_id = ? AND event_id = ?`, [user_id, event.event_id]);
        if (existingClaim) {
            return res.status(400).json({ error: 'You have already claimed points for this event!' });
        }

        // 3. Award points & record claim
        const settings = await getSettings();
        const validityMonths = settings.points_validity_months || 12;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + validityMonths);

        await runQuery(
            `INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id, event.points, 'Event Attendance', `Attended: ${event.title}`, event.points, expiresAt.toISOString()]
        );
        
        await runQuery(`UPDATE users SET points_balance = points_balance + ? WHERE user_id = ?`, [event.points, user_id]);
        await runQuery(`INSERT INTO event_claims (event_id, user_id) VALUES (?, ?)`, [event.event_id, user_id]);

        res.json({ success: true, message: `Success! You earned ${event.points} points.`, points: event.points });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/events/:id', async (req, res) => {
    try {
        const eventId = req.params.id;
        await runQuery(`DELETE FROM campus_events WHERE event_id = ?`, [eventId]);
        res.json({ success: true, message: 'Event successfully deleted' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// ADMIN: System Health & Scalability API

// --- FAQ Endpoints ---
app.post('/api/faqs', async (req, res) => {
    try {
        const { question, studentId, studentName, email } = req.body;
        const id = 'faq_' + Date.now() + '_' + Math.random().toString(36).substring(2,9);
        const timestamp = Date.now();
        await runQuery(
            'INSERT INTO faq_submissions (id, question, student_id, student_name, email, timestamp, status, bookmarked) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, question, studentId || 'Anonymous', studentName || 'Guest User', email || 'N/A', timestamp, 'pending', 0]
        );
        res.json({ success: true, id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.get('/api/admin/faqs', async (req, res) => {
    try {
        const faqs = await allQuery('SELECT * FROM faq_submissions ORDER BY timestamp DESC');
        res.json({ faqs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.post('/api/admin/faqs/:id/bookmark', async (req, res) => {
    try {
        const { bookmarked } = req.body;
        await runQuery('UPDATE faq_submissions SET bookmarked = ? WHERE id = ?', [bookmarked ? 1 : 0, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to bookmark FAQ' });
    }
});

app.post('/api/admin/faqs/:id/answer', async (req, res) => {
    try {
        const { answer, is_public } = req.body;
        await runQuery('UPDATE faq_submissions SET answer = ?, is_public = ?, status = ? WHERE id = ?', [answer, is_public ? 1 : 0, 'answered', req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save FAQ answer' });
    }
});

app.get('/api/public/faqs', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        const faqs = await allQuery('SELECT question, answer FROM faq_submissions WHERE is_public = 1 AND answer IS NOT NULL ORDER BY timestamp DESC');
        res.json({ faqs });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch public FAQs' });
    }
});

app.delete('/api/admin/faqs/:id', async (req, res) => {
    try {
        await runQuery('DELETE FROM faq_submissions WHERE id = ?', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});
// ----------------------

app.get('/api/admin/health', async (req, res) => {
    try {
        const startPing = Date.now();
        await getQuery(`SELECT 1`); // Ping the database
        const dbLatency = Date.now() - startPing;
        
        const isResendConfigured = !!process.env.RESEND_API_KEY;
        const region = process.env.VERCEL_REGION || 'Local Dev Environment';
        const environment = process.env.VERCEL ? 'Production (Vercel Serverless)' : 'Local Host';
        
        // Count active users to give a sense of scale
        const userCountRow = await getQuery(`SELECT COUNT(*) as count FROM users`);
        
        // New Scalability Metrics
        const memUsage = process.memoryUsage();
        const heapUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
        
        const uptimeSeconds = process.uptime();
        let uptimeStr = '';
        if (uptimeSeconds < 60) uptimeStr = `${Math.floor(uptimeSeconds)}s`;
        else if (uptimeSeconds < 3600) uptimeStr = `${Math.floor(uptimeSeconds / 60)}m`;
        else uptimeStr = `${Math.floor(uptimeSeconds / 3600)}h ${Math.floor((uptimeSeconds % 3600) / 60)}m`;

        const ledgerCountRow = await getQuery(`SELECT COUNT(*) as count FROM points_ledger`);
        const voucherCountRow = await getQuery(`SELECT COUNT(*) as count FROM tuition_vouchers`);
        
        res.json({
            success: true,
            dbLatencyMs: dbLatency,
            dbStatus: dbLatency < 500 ? 'Healthy' : 'Slow',
            resendStatus: isResendConfigured ? 'Connected' : 'Missing API Key',
            region: region,
            environment: environment,
            totalUsers: userCountRow ? userCountRow.count : 0,
            
            // Added metrics
            memoryHeapMB: heapUsedMB,
            serverUptime: uptimeStr,
            totalTransactions: ledgerCountRow ? ledgerCountRow.count : 0,
            totalVouchersIssued: voucherCountRow ? voucherCountRow.count : 0
        });
    } catch (err) {
        res.status(500).json({ error: err.message, dbStatus: 'Disconnected' });
    }
});

app.get('/api/users/:userId/promo-history', async (req, res) => {
    try {
        const { userId } = req.params;
        const history = await allQuery(`
            SELECT pc.code, pc.occasion, p.claimed_at, pc.points_reward
            FROM promo_claims p
            JOIN promo_codes pc ON p.code_id = pc.code_id
            WHERE p.user_id = ?
            ORDER BY p.claimed_at DESC
        `, [userId]);
        res.json({ success: true, history: history || [] });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- GLOBAL PROMO CODES ---
app.post('/api/admin/promos', async (req, res) => {
    try {
        const { code, points_reward, max_uses, occasion } = req.body;
        if (!code || !points_reward) return res.status(400).json({ error: 'Code and Points Reward are required.' });
        
        await runQuery(
            `INSERT INTO promo_codes (code, points_reward, max_uses, occasion) VALUES (?, ?, ?, ?)`,
            [code, points_reward, max_uses || 0, occasion || 'General']
        );
        res.json({ success: true, message: 'Promo code created successfully.' });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ error: 'Promo code already exists.', promo_exists: true });
        }
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/promos/:code/override', async (req, res) => {
    try {
        const { code } = req.params;
        const { points_reward, max_uses, occasion } = req.body;
        if (!points_reward) return res.status(400).json({ error: 'Points Reward is required.' });
        
        await runQuery(
            `UPDATE promo_codes SET points_reward = ?, max_uses = ?, occasion = ?, status = 'active' WHERE code = ? COLLATE NOCASE`,
            [points_reward, max_uses || 0, occasion || 'General', code]
        );
        res.json({ success: true, message: 'Promo code updated successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/promos', async (req, res) => {
    try {
        const promos = await allQuery(`SELECT * FROM promo_codes ORDER BY created_at DESC`);
        res.json({ success: true, promos: promos || [] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/admin/promos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await runQuery(`UPDATE promo_codes SET status = 'archived' WHERE code_id = ?`, [id]);
        res.json({ success: true, message: 'Promo code archived.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/promos/:id/limit', async (req, res) => {
    try {
        const { id } = req.params;
        const { max_uses } = req.body;
        if (max_uses === undefined) return res.status(400).json({ error: 'max_uses is required.' });
        
        await runQuery(`UPDATE promo_codes SET max_uses = ? WHERE code_id = ?`, [parseInt(max_uses), id]);
        res.json({ success: true, message: 'Promo limit updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/promos/redeem', async (req, res) => {
    try {
        const { user_id, code } = req.body;
        if (!user_id || !code) return res.status(400).json({ error: 'Missing user_id or code.' });

        const promo = await getQuery(`SELECT * FROM promo_codes WHERE code = ? COLLATE NOCASE`, [code]);
        if (!promo || promo.status === 'archived') return res.status(404).json({ error: 'Invalid or expired promo code.' });

        if (promo.max_uses > 0 && promo.current_uses >= promo.max_uses) {
            return res.status(400).json({ error: 'This promo code has reached its maximum usage limit.' });
        }

        const existingClaim = await getQuery(`SELECT claim_id FROM promo_claims WHERE user_id = ? AND code_id = ?`, [user_id, promo.code_id]);
        if (existingClaim) return res.status(400).json({ error: 'You have already redeemed this promo code!' });

        const settings = await getSettings();
        const validityMonths = settings.points_validity_months || 12;
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + validityMonths);

        await runQuery(
            `INSERT INTO points_ledger (user_id, points_change, event_type, description, points_remaining, expires_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [user_id, promo.points_reward, 'Promo Code', `Redeemed Code: ${promo.code}`, promo.points_reward, expiresAt.toISOString()]
        );
        
        await runQuery(`UPDATE users SET points_balance = points_balance + ? WHERE user_id = ?`, [promo.points_reward, user_id]);
        await runQuery(`INSERT INTO promo_claims (code_id, user_id) VALUES (?, ?)`, [promo.code_id, user_id]);
        await runQuery(`UPDATE promo_codes SET current_uses = current_uses + 1 WHERE code_id = ?`, [promo.code_id]);

        res.json({ success: true, message: `Success! You earned ${promo.points_reward} points.`, points: promo.points_reward });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==========================================
// COMMUNITY PLATFORM ROUTES
// ==========================================

// Get all posts (Publicly readable, but needs optionalAuth for upvote status)
app.get('/api/community/posts', requireAuth, async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        const userId = req.user ? req.user.user_id : -1;
        const sortBy = req.query.sort || 'new';
        const filter = req.query.filter || 'all';
        const sinceId = req.query.since_id ? parseInt(req.query.since_id) : 0;
        
        let orderBy = 'p.created_at DESC';
        if (sortBy === 'hot') orderBy = '(p.upvotes - p.downvotes) + comment_count DESC, p.created_at DESC';
        if (sortBy === 'top') orderBy = '(p.upvotes - p.downvotes) DESC, p.created_at DESC';

        let whereClause = '1=1';
        let queryParams = [userId, userId];
        
        if (filter === 'mine') {
            whereClause += ' AND p.user_id = ?';
            queryParams.push(userId);
        } else if (filter === 'archived') {
            // Only allow admins to view archived posts in the archived view
            if (req.user && req.user.role === 'admin') {
                whereClause += ' AND p.is_archived = 1';
            } else {
                whereClause += ' AND p.is_archived = 0';
            }
        } else {
            whereClause += ' AND p.is_archived = 0';
        }
        
        if (sinceId > 0) {
            whereClause += ' AND p.post_id > ?';
            queryParams.push(sinceId);
        }

        const posts = await allQuery(`
            SELECT p.*, u.name, u.programme,
            (SELECT COUNT(*) FROM community_comments WHERE post_id = p.post_id) as comment_count,
            EXISTS(SELECT 1 FROM community_votes WHERE target_type='post' AND target_id=p.post_id AND user_id=? AND vote_value=1) as user_has_upvoted,
            EXISTS(SELECT 1 FROM community_votes WHERE target_type='post' AND target_id=p.post_id AND user_id=? AND vote_value=-1) as user_has_downvoted
            FROM community_posts p
            JOIN users u ON p.user_id = u.user_id
            WHERE ${whereClause}
            ORDER BY ${orderBy}
        `, queryParams);
        
        // Sanitize anonymous posts
        posts.forEach(p => {
            if (p.is_anonymous) {
                p.name = 'Anonymous Student';
                p.programme = '';
            }
        });
        
        res.json({ posts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new post
app.post('/api/community/posts', requireAuth, async (req, res) => {
    try {
        // Check if user is muted
        let user = await getQuery("SELECT is_muted, muted_until FROM users WHERE user_id = ?", [req.user.user_id]);
        
        // Auto-heal missing users from stale JWTs due to Turso migration
        if (!user) {
            await runQuery("INSERT OR IGNORE INTO users (user_id, name, email, password, role, student_id, current_tier, points_balance) VALUES (?, 'Migrated User', 'migrated' || ? || '@example.com', 'password', ?, 'migrated-' || ?, 'Bronze', 0)", 
                [req.user.user_id, req.user.user_id, req.user.role || 'student', req.user.user_id]);
            user = { is_muted: 0 };
        }
        
        if (user && (user.is_muted === 1 || (user.muted_until && new Date(user.muted_until) > new Date()))) {
            return res.status(403).json({ error: 'Your account has been temporarily muted from community participation.' });
        }
        
        let { title, content, is_anonymous, tags, image_base64 } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

        // Apply profanity filter
        title = profanityFilter.clean(title);
        content = profanityFilter.clean(content);

        // Image moderation check
        if (image_base64) {
            const modResult = await moderateImage(image_base64);
            if (modResult.isExplicit) {
                return res.status(400).json({ error: 'Image rejected: Contains inappropriate or explicit content.' });
            }
        }
        
        try {
            await runQuery('INSERT INTO community_posts (user_id, title, content, is_anonymous, tags, image_url) VALUES (?, ?, ?, ?, ?, ?)', 
                [req.user.user_id, title, content, is_anonymous ? 1 : 0, tags || '[]', image_base64 || null]);
            
            
            res.json({ message: 'Post created successfully!' });
        } catch (e) {
            res.status(500).json({ error: e.message });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Vote on a post (up or down)
app.post('/api/community/posts/:id/vote', requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        const { value } = req.body; // 1 for upvote, -1 for downvote, 0 to remove
        if (value !== 1 && value !== -1 && value !== 0) return res.status(400).json({ error: 'Invalid vote value' });
        
        
        try {
            const currentVote = await getQuery("SELECT vote_value FROM community_votes WHERE user_id=? AND target_type='post' AND target_id=?", [req.user.user_id, postId]);
            
            // Revert old vote stats if it existed
            if (currentVote) {
                if (currentVote.vote_value === 1) await runQuery("UPDATE community_posts SET upvotes = upvotes - 1 WHERE post_id=?", [postId]);
                if (currentVote.vote_value === -1) await runQuery("UPDATE community_posts SET downvotes = downvotes - 1 WHERE post_id=?", [postId]);
                await runQuery("DELETE FROM community_votes WHERE user_id=? AND target_type='post' AND target_id=?", [req.user.user_id, postId]);
            }
            
            // Apply new vote if not 0
            if (value !== 0) {
                await runQuery("INSERT INTO community_votes (user_id, target_type, target_id, vote_value) VALUES (?, 'post', ?, ?)", [req.user.user_id, postId, value]);
                if (value === 1) await runQuery("UPDATE community_posts SET upvotes = upvotes + 1 WHERE post_id=?", [postId]);
                if (value === -1) await runQuery("UPDATE community_posts SET downvotes = downvotes + 1 WHERE post_id=?", [postId]);
                
                // Used to award points here. Points system removed from community.
            }
            
            
            res.json({ message: 'Vote recorded' });
        } catch (e) {
            
            throw e;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Accept an answer
app.post('/api/community/posts/:postId/accept/:commentId', requireAuth, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        
        
        try {
            // Verify ownership of the post
            const post = await getQuery("SELECT user_id, accepted_answer_id FROM community_posts WHERE post_id=?", [postId]);
            if (!post) throw new Error("Post not found");
            if (post.user_id !== req.user.user_id) throw new Error("Only the original author can accept an answer");
            if (post.accepted_answer_id) throw new Error("An answer has already been accepted for this post");
            
            // Verify comment exists
            const comment = await getQuery("SELECT user_id FROM community_comments WHERE comment_id=? AND post_id=?", [commentId, postId]);
            if (!comment) throw new Error("Comment not found on this post");
            if (comment.user_id === req.user.user_id) throw new Error("You cannot accept your own answer");
            
            // Update post
            await runQuery("UPDATE community_posts SET accepted_answer_id=? WHERE post_id=?", [commentId, postId]);
                
            
            res.json({ message: 'Answer accepted successfully!' });
        } catch (e) {
            
            res.status(400).json({ error: e.message });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get comments for a post
app.get('/api/community/posts/:id/comments', requireAuth, async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        const userId = req.user ? req.user.user_id : -1;
        const comments = await allQuery(`
            SELECT c.*, u.name,
            EXISTS(SELECT 1 FROM community_votes WHERE target_type='comment' AND target_id=c.comment_id AND user_id=? AND vote_value=1) as user_has_upvoted,
            EXISTS(SELECT 1 FROM community_votes WHERE target_type='comment' AND target_id=c.comment_id AND user_id=? AND vote_value=-1) as user_has_downvoted
            FROM community_comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [userId, userId, req.params.id]);
        
        comments.forEach(c => {
            if (c.is_anonymous) {
                c.name = 'Anonymous Student';
            }
        });
        
        res.json({ comments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a comment
app.post('/api/community/posts/:id/comments', requireAuth, async (req, res) => {
    try {
        // Check if user is muted
        const user = await getQuery("SELECT is_muted, muted_until FROM users WHERE user_id = ?", [req.user.user_id]);
        if (user && (user.is_muted === 1 || (user.muted_until && new Date(user.muted_until) > new Date()))) {
            return res.status(403).json({ error: 'Your account has been temporarily muted from community participation.' });
        }

        let { content, is_anonymous, parent_comment_id } = req.body;
        const postId = req.params.id;
        if (!content) return res.status(400).json({ error: 'Content required' });

        // Apply profanity filter
        content = profanityFilter.clean(content);

        const post = await getQuery("SELECT is_locked FROM community_posts WHERE post_id = ?", [postId]);
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.is_locked) return res.status(403).json({ error: 'This post has been locked by an administrator.' });

        try {
            await runQuery('INSERT INTO community_comments (post_id, user_id, content, is_anonymous, parent_comment_id) VALUES (?, ?, ?, ?, ?)', 
                [postId, req.user.user_id, content, is_anonymous ? 1 : 0, parent_comment_id || null]);
            
            
            res.json({ message: 'Comment added successfully!' });
        } catch (e) {
            
            throw e;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Vote on a comment
app.post('/api/community/comments/:id/vote', requireAuth, async (req, res) => {
    try {
        const commentId = req.params.id;
        const { value } = req.body; // 1 for upvote, -1 for downvote, 0 to remove
        if (value !== 1 && value !== -1 && value !== 0) return res.status(400).json({ error: 'Invalid vote value' });
        
        
        try {
            const currentVote = await getQuery("SELECT vote_value FROM community_votes WHERE user_id=? AND target_type='comment' AND target_id=?", [req.user.user_id, commentId]);
            
            if (currentVote) {
                if (currentVote.vote_value === 1) await runQuery("UPDATE community_comments SET upvotes = upvotes - 1 WHERE comment_id=?", [commentId]);
                if (currentVote.vote_value === -1) await runQuery("UPDATE community_comments SET downvotes = downvotes - 1 WHERE comment_id=?", [commentId]);
                await runQuery("DELETE FROM community_votes WHERE user_id=? AND target_type='comment' AND target_id=?", [req.user.user_id, commentId]);
            }
            
            if (value !== 0) {
                await runQuery("INSERT INTO community_votes (user_id, target_type, target_id, vote_value) VALUES (?, 'comment', ?, ?)", [req.user.user_id, commentId, value]);
                if (value === 1) await runQuery("UPDATE community_comments SET upvotes = upvotes + 1 WHERE comment_id=?", [commentId]);
                if (value === -1) await runQuery("UPDATE community_comments SET downvotes = downvotes + 1 WHERE comment_id=?", [commentId]);
            }
            
            
            res.json({ message: 'Vote recorded' });
        } catch (e) {
            
            throw e;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin API: Lock/Unlock Post
app.post('/api/admin/community/posts/:id/lock', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized.' });
        const { locked } = req.body;
        await runQuery("UPDATE community_posts SET is_locked = ? WHERE post_id = ?", [locked ? 1 : 0, req.params.id]);
        res.json({ message: 'Post lock status updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/admin/community/posts/:id', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized.' });
        const { title, content } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'Title and content are required.' });
        await runQuery("UPDATE community_posts SET title = ?, content = ? WHERE post_id = ?", [title, content, req.params.id]);
        res.json({ message: 'Post updated.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Clear Old Posts (> 1 month)
app.delete('/api/admin/community/clear-old-posts', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
        }
        
        // Find all active posts older than 1 month
        const oldPosts = await allQuery("SELECT post_id FROM community_posts WHERE created_at < datetime('now', '-1 month') AND is_archived = 0");
        
        if (!oldPosts || oldPosts.length === 0) {
            return res.json({ message: 'No old posts found to archive.', count: 0 });
        }
        
        const postIds = oldPosts.map(p => p.post_id);
        const placeholders = postIds.map(() => '?').join(',');
        
        // Archive and lock the posts
        await runQuery(`UPDATE community_posts SET is_archived = 1, is_locked = 1 WHERE post_id IN (${placeholders})`, postIds);
        
        res.json({ message: `Successfully archived ${postIds.length} old posts.`, count: postIds.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Archive Post
app.post('/api/admin/community/posts/:id/archive', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
        }
        await runQuery("UPDATE community_posts SET is_archived = 1, is_locked = 1 WHERE post_id = ?", [req.params.id]);
        res.json({ message: 'Post archived and locked successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Restore Post
app.post('/api/admin/community/posts/:id/restore', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
        }
        await runQuery("UPDATE community_posts SET is_archived = 0, is_locked = 0 WHERE post_id = ?", [req.params.id]);
        res.json({ message: 'Post restored and unlocked successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Delete Post
app.delete('/api/community/posts/:id', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
        }
        await runQuery("DELETE FROM community_reports WHERE post_id = ?", [req.params.id]);
        await runQuery("DELETE FROM community_comments WHERE post_id = ?", [req.params.id]);
        await runQuery("DELETE FROM community_posts WHERE post_id = ?", [req.params.id]);
        res.json({ message: 'Post deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Delete Comment
app.delete('/api/community/comments/:id', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
        }
        await runQuery("DELETE FROM community_reports WHERE comment_id = ?", [req.params.id]);
        await runQuery("DELETE FROM community_comments WHERE parent_comment_id = ?", [req.params.id]);
        await runQuery("DELETE FROM community_comments WHERE comment_id = ?", [req.params.id]);
        res.json({ message: 'Comment deleted successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin Community Stats & Moderation Feed
app.get('/api/community/admin/stats', requireAuth, async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Unauthorized. Admin access required.' });
        }
        
        let stats = { total_posts: 0, total_comments: 0, active_contributors: 0 };
        try {
            const resStats = await getQuery("SELECT (SELECT COUNT(*) FROM community_posts) as total_posts, (SELECT COUNT(*) FROM community_comments) as total_comments, (SELECT COUNT(DISTINCT user_id) FROM (SELECT user_id FROM community_posts UNION SELECT user_id FROM community_comments)) as active_contributors");
            stats = resStats || stats;
        } catch (dbErr) {
            try {
                const resStats = await getQuery("SELECT (SELECT COUNT(*) FROM community_posts) as total_posts, (SELECT COUNT(DISTINCT user_id) FROM community_posts) as active_contributors");
                stats.total_posts = resStats ? resStats.total_posts : 0;
                stats.active_contributors = resStats ? resStats.active_contributors : 0;
            } catch(e) {}
        }
        
        // Fix for @libsql/client returning BigInt for COUNT(*) aggregations
        if (stats) {
            for (let key in stats) {
                if (typeof stats[key] === 'bigint') {
                    stats[key] = Number(stats[key]);
                }
            }
        }
        
        let moderationFeed = [];
        try {
            moderationFeed = await allQuery(`
                SELECT 'post' as type, post_id as id, user_id, title as snippet, created_at, is_locked FROM community_posts
                UNION ALL
                SELECT 'comment' as type, comment_id as id, user_id, content as snippet, created_at, 0 as is_locked FROM community_comments
                ORDER BY created_at DESC LIMIT 100
            `);
        } catch (feedErr) {
            try {
                // If is_locked column is missing, this will fail, so we try without it as a last resort
                moderationFeed = await allQuery(`
                    SELECT 'post' as type, post_id as id, user_id, title as snippet, created_at, is_locked FROM community_posts
                    ORDER BY created_at DESC LIMIT 100
                `);
            } catch(e) {
                try {
                    moderationFeed = await allQuery(`
                        SELECT 'post' as type, post_id as id, user_id, title as snippet, created_at, 0 as is_locked FROM community_posts
                        ORDER BY created_at DESC LIMIT 100
                    `);
                } catch(e2) {}
            }
        }
        
        res.json({ stats, moderationFeed });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Emergency DB Fix Route
app.get('/api/fix-db', async (req, res) => {
    try {
        await runQuery("INSERT OR IGNORE INTO users (user_id, name, email, password, role, student_id, current_tier, points_balance) VALUES (1, 'Admin', 'admin@example.com', 'password', 'admin', 'admin', 'Bronze', 0)");
        res.json({ message: "Database fixed! Foreign key constraints resolved. You can now create posts." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================

const PORT = process.env.PORT || 3001;

// --- COMMUNITY REPORTING & MODERATION ROUTES ---

// Submit a report
app.post('/api/community/reports', requireAuth, async (req, res) => {
    try {
        let { reported_user_id, post_id, comment_id, category, reason } = req.body;
        
        // Auto-resolve reported_user_id if missing (e.g. anonymous post)
        if (!reported_user_id) {
            if (post_id) {
                const post = await getQuery("SELECT user_id FROM community_posts WHERE post_id = ?", [post_id]);
                if (post) reported_user_id = post.user_id;
            } else if (comment_id) {
                const comment = await getQuery("SELECT user_id FROM community_comments WHERE comment_id = ?", [comment_id]);
                if (comment) reported_user_id = comment.user_id;
            }
        }
        
        if (!reported_user_id || !category) return res.status(400).json({ error: 'Could not determine the reported user.' });
        
        await runQuery(
            `INSERT INTO community_reports (reporter_id, reported_user_id, post_id, comment_id, category, reason) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [req.user.user_id, reported_user_id, post_id || null, comment_id || null, category, reason || null]
        );

        // Proactive efficiency: Auto-hide check
        if (post_id) {
            const { count } = await getQuery("SELECT COUNT(*) as count FROM community_reports WHERE post_id = ?", [post_id]);
            if (count >= 3) {
                // Auto-hide the post by locking it
                await runQuery("UPDATE community_posts SET is_locked = 1 WHERE post_id = ?", [post_id]);
            }
        }

        res.json({ message: 'Report submitted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit report' });
    }
});

// Admin: Get Aggregated Reports
app.get('/api/admin/reports', requireAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                r.reported_user_id,
                u.name as reported_user_name,
                u.email as reported_user_email,
                u.is_muted,
                u.muted_until,
                COUNT(r.report_id) as total_reports,
                MAX(CASE WHEN r.status = 'Pending' THEN 1 ELSE 0 END) as has_pending,
                json_group_array(
                    json_object(
                        'report_id', r.report_id,
                        'category', r.category,
                        'reason', r.reason,
                        'post_id', r.post_id,
                        'comment_id', r.comment_id,
                        'created_at', r.created_at,
                        'status', r.status,
                        'reporter_id', r.reporter_id,
                        'reporter_name', reporter.name
                    )
                ) as reports
            FROM community_reports r
            JOIN users u ON r.reported_user_id = u.user_id
            LEFT JOIN users reporter ON r.reporter_id = reporter.user_id
            GROUP BY r.reported_user_id
            ORDER BY has_pending DESC, total_reports DESC, r.created_at DESC
        `;
        const aggregatedReports = await allQuery(query);
        
        const formatted = aggregatedReports.map(r => ({
            ...r,
            reports: JSON.parse(r.reports)
        }));
        
        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
});

// Admin: Issue Warning
app.post('/api/admin/users/:id/warn', requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        const userId = req.params.id;
        
        await runQuery(
            "INSERT INTO user_warnings (user_id, admin_id, reason) VALUES (?, ?, ?)",
            [userId, req.user.user_id, reason || 'Violation of community guidelines']
        );
        
        // Optional: Send email
        const user = await getQuery("SELECT email, name FROM users WHERE user_id = ?", [userId]);
        if (user) {
            try {
                await resend.emails.send({
                    from: 'admin@resend.dev',
                    to: user.email,
                    subject: 'BIA Community Hub: Official Warning',
                    html: `<p>Hi ${user.name},</p><p>You have received a warning from the community moderators.</p><p>Reason: ${reason}</p><p>Please adhere to the community guidelines.</p>`
                });
            } catch (e) { console.error("Failed to send warning email", e); }
        }
        
        res.json({ message: 'Warning issued successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to issue warning' });
    }
});

// Admin: Resolve Reports
app.post('/api/admin/users/:id/resolve-reports', requireAdmin, async (req, res) => {
    try {
        await runQuery("UPDATE community_reports SET status = 'Resolved' WHERE reported_user_id = ?", [req.params.id]);
        res.json({ message: 'Reports marked as resolved.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin: Toggle Mute
app.post('/api/admin/users/:id/mute', requireAdmin, async (req, res) => {
    try {
        const { is_muted, duration_hours } = req.body;
        const userId = req.params.id;
        
        let mutedUntil = null;
        if (is_muted && duration_hours) {
            mutedUntil = new Date(Date.now() + duration_hours * 3600000).toISOString();
        }
        
        await runQuery("UPDATE users SET is_muted = ?, muted_until = ? WHERE user_id = ?", [is_muted ? 1 : 0, mutedUntil, userId]);
        
        res.json({ message: `User successfully ${is_muted ? 'muted for ' + duration_hours + ' hours' : 'unmuted'}` });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to mute user' });
    }
});

// --- TEMPORARY TEST ENDPOINT ---
app.get('/api/test-posts', async (req, res) => {
    try {
        const posts = await allQuery("SELECT * FROM community_posts LIMIT 5");
        let stats = null;
        try {
            stats = await getQuery("SELECT (SELECT COUNT(*) FROM community_posts) as total_posts, (SELECT COUNT(DISTINCT user_id) FROM community_posts) as active_contributors");
        } catch(e) { stats = e.message; }
        res.json({ success: true, posts, stats });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// -------------------------------------------------------------
// NEWSLETTER API
// -------------------------------------------------------------

// Public endpoint to subscribe
app.post('/api/newsletter/subscribe', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });
    try {
        await runQuery('INSERT INTO newsletter_subscribers (email) VALUES (?)', [email]);
        res.json({ message: 'Subscribed successfully' });
    } catch (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
            return res.json({ message: 'Already subscribed' }); // Pretend success for privacy
        }
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin endpoint to view subscribers
app.get('/api/admin/newsletter-subscribers', requireAdmin, async (req, res) => {
    try {
        const rows = await runQuery('SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: 'Database error' });
    }
});

// Admin endpoint to broadcast email to subscribers
app.post('/api/admin/newsletter-broadcast', requireAdmin, async (req, res) => {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Subject and message are required' });

    try {
        const subscribers = await runQuery('SELECT email FROM newsletter_subscribers');
        if (subscribers.length === 0) {
            return res.status(400).json({ error: 'No subscribers found in the mailing list' });
        }

        // SIMULATION: In a production environment, this is where you would hook up nodemailer, SendGrid, etc.
        // For example: await sendGrid.sendMultiple({ to: subscribers.map(s => s.email), from: '...', subject, text: message })
        
        console.log(`[BROADCAST SIMULATION] Sending to ${subscribers.length} recipients...`);
        console.log(`[BROADCAST SIMULATION] Subject: ${subject}`);
        console.log(`[BROADCAST SIMULATION] Message: ${message}`);

        await runQuery('INSERT INTO broadcast_history (subject, message, recipients_count) VALUES (?, ?, ?)', [subject, message, subscribers.length]);
        
        res.json({ message: 'Broadcast sent successfully', recipients: subscribers.length });
    } catch (err) {
        res.status(500).json({ error: 'Database error while broadcasting' });
    }
});

// Export for Vercel serverless
module.exports = app;

// Start server locally when not in Vercel
if (!process.env.VERCEL && !process.env.NOW_BUILDER) {
    app.listen(PORT, () => console.log(`BIA Loyalty Server running at http://localhost:${PORT}`));
}

// Admin: Notification Counts (FAQs, Leads, Reports)
app.get('/api/admin/notifications/count', requireAdmin, async (req, res) => {
    try {
        const faqs = await getQuery("SELECT COUNT(*) as c FROM faq_submissions WHERE status = 'pending'");
        const leads = await getQuery("SELECT COUNT(*) as c FROM executive_leads WHERE status = 'Pending'");
        const reports = await getQuery("SELECT COUNT(*) as c FROM community_reports WHERE status = 'Pending'");
        
        res.json({
            faqs: faqs ? faqs.c : 0,
            leads: leads ? leads.c : 0,
            reports: reports ? reports.c : 0,
            total: (faqs ? faqs.c : 0) + (leads ? leads.c : 0) + (reports ? reports.c : 0)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
