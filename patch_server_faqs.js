const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

// 1. Add table creation
const createTableLine = '        await runQuery(`CREATE TABLE IF NOT EXISTS ip_blacklist (';
const newCreateTable = `        await runQuery(\`CREATE TABLE IF NOT EXISTS faq_submissions (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            student_id TEXT NOT NULL,
            student_name TEXT NOT NULL,
            email TEXT,
            timestamp INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            bookmarked INTEGER DEFAULT 0
        )\`);
` + createTableLine;

server = server.replace(createTableLine, newCreateTable);

// 2. Add API endpoints
// Find a good place to inject the new routes, for example before app.get('/api/admin/health'
const injectionPoint = "app.get('/api/admin/health', async (req, res) => {";
const newRoutes = `
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
        const faqs = await fetchAll('SELECT * FROM faq_submissions ORDER BY timestamp DESC');
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
        res.status(500).json({ error: 'Database error' });
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

` + injectionPoint;

server = server.replace(injectionPoint, newRoutes);

fs.writeFileSync('server.js', server, 'utf8');
console.log('server.js patched with FAQ endpoints');
