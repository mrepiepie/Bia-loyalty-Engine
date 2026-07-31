const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

const meEndpoint = `
app.get('/api/auth/me', requireAdmin, async (req, res) => {
    // wait, requireAdmin is too strict. We need requireAuth.
});
`;
// Let's just create requireAuth middleware first.

const requireAuth = `
// Middleware for any Authenticated User
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

app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
        const user = await getQuery('SELECT * FROM users WHERE user_id = ?', [req.user.user_id]);
        if (!user) return res.status(404).json({ error: 'User not found' });
        delete user.password_hash;
        res.json({ user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
`;

if (!content.includes('/api/auth/me')) {
    content = content.replace("// Middleware for Admin Routes", requireAuth + "\n// Middleware for Admin Routes");
    fs.writeFileSync('server.js', content);
    console.log("Added /api/auth/me and requireAuth middleware.");
} else {
    console.log("Already added.");
}
