const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const anchor = `// Admin endpoint: Get all referrals
app.get('/api/admin/referrals', async (req, res) => {`;

const insertion = `// Admin endpoint: Get all tuition vouchers
app.get('/api/admin/vouchers', async (req, res) => {
    try {
        const vouchers = await allQuery(\`
            SELECT v.*, u.name as student_name, u.email as student_email, u.student_id
            FROM tuition_vouchers v
            LEFT JOIN users u ON v.user_id = u.user_id
            ORDER BY v.voucher_id DESC
        \`);
        res.json(vouchers);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Admin endpoint: Get all referrals
app.get('/api/admin/referrals', async (req, res) => {`;

if (code.includes(anchor) && !code.includes('/api/admin/vouchers\',')) {
    code = code.replace(anchor, insertion);
    fs.writeFileSync('server.js', code);
    console.log("Patched server.js with /api/admin/vouchers endpoint.");
} else {
    console.log("Anchor not found or already patched.");
}
