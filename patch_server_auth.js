const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

const importPatch = `const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-bia-key-2026';`;

content = content.replace("const fs = require('fs');", importPatch);

const authRoutes = `
// ==========================================
// AUTHENTICATION ROUTES
// ==========================================

app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, student_id, programme, password } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required' });

        const existing = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
        if (existing) return res.status(400).json({ error: 'Email already in use' });

        const password_hash = await bcrypt.hash(password, 10);
        
        await runQuery(
            \`INSERT INTO users (name, email, student_id, programme, password_hash, role) VALUES (?, ?, ?, ?, ?, 'student')\`,
            [name, email, student_id || null, programme || 'General', password_hash]
        );
        
        const newUser = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
        const token = jwt.sign({ user_id: newUser.user_id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
        
        delete newUser.password_hash;
        res.json({ token, user: newUser });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

        const user = await getQuery('SELECT * FROM users WHERE email = ?', [email]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        // Allow login without password if password_hash is not set (for legacy mock users)
        if (user.password_hash) {
            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) return res.status(401).json({ error: 'Invalid credentials' });
        } else if (password !== 'test') { // fallback simple password for legacy accounts
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ user_id: user.user_id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        delete user.password_hash;
        res.json({ token, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Middleware for Admin Routes
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

// ==========================================
`;

if (!content.includes('/api/auth/register')) {
    const target = "// ==========================================\n// API ENDPOINTS\n// ==========================================";
    content = content.replace(target, authRoutes + target);
}

// Add the middleware to admin routes
const adminEndpoints = [
    "app.get('/api/admin/users'",
    "app.get('/api/admin/ledger'",
    "app.get('/api/admin/students'",
    "app.get('/api/admin/vouchers'",
    "app.post('/api/admin/vouchers/use'"
];

adminEndpoints.forEach(endpoint => {
    const updated = endpoint.replace("'", "'").replace(", async", ", requireAdmin, async");
    if (!content.includes(updated)) {
         content = content.replace(endpoint, updated);
    }
});


fs.writeFileSync('server.js', content);
console.log("Patched server.js with Auth routes.");
