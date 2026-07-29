const fs = require('fs');

let server = fs.readFileSync('server.js', 'utf8');

// 1. Add the password_resets table to initialization
const tableStr = `CREATE TABLE IF NOT EXISTS points_ledger`;
const newTable = `CREATE TABLE IF NOT EXISTS password_resets (
            reset_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            code TEXT NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        );
        await runQuery(\`CREATE TABLE IF NOT EXISTS points_ledger`;

server = server.replace(tableStr, newTable);

// 2. Add Resend integration and rewrite the retrieve-password endpoint
// First, require Resend at the top
if (!server.includes("const { Resend }")) {
    server = server.replace(
        "const express = require('express');",
        "const express = require('express');\nconst { Resend } = require('resend');"
    );
}

// 3. Rewrite /api/auth/retrieve-password
const oldRetrieve = `app.post('/api/auth/retrieve-password', async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ error: 'Email or Student ID required' });
        const user = await getQuery(\`SELECT name, email, password, student_id, role FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(student_id) = LOWER(?)\`, [identifier.trim(), identifier.trim()]);
        if (!user) return res.status(404).json({ error: 'No account matched.' });
        res.json({ success: true, user });
    } catch (err) { res.status(500).json({ error: err.message }); }
});`;

const newRetrieve = `app.post('/api/auth/retrieve-password', async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ error: 'Email or Student ID required' });
        const user = await getQuery(\`SELECT user_id, name, email FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(student_id) = LOWER(?)\`, [identifier.trim(), identifier.trim()]);
        
        if (!user) {
            // Delay slightly to prevent timing attacks
            await new Promise(resolve => setTimeout(resolve, 500));
            return res.json({ success: true, message: 'If an account matched, a verification code was sent.' });
        }

        // Generate 6-digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expiry in 15 mins
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + 15);

        // Invalidate old codes
        await runQuery(\`UPDATE password_resets SET used = 1 WHERE user_id = ?\`, [user.user_id]);

        // Save code
        await runQuery(\`INSERT INTO password_resets (user_id, code, expires_at) VALUES (?, ?, ?)\`, [user.user_id, code, expiresAt.toISOString()]);

        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey && resendApiKey !== 'dummy') {
            const resend = new Resend(resendApiKey);
            await resend.emails.send({
                from: 'BIA Security <onboarding@resend.dev>',
                to: user.email,
                subject: 'BIA LoyaltyEngine - Verification Code',
                html: \`
                    <div style="font-family: sans-serif; padding: 20px;">
                        <h2>Credentials Verification</h2>
                        <p>Hi \${user.name},</p>
                        <p>Your 6-digit verification code is: <strong>\${code}</strong></p>
                        <p>This code will expire in 15 minutes.</p>
                        <p>If you did not request this, please ignore this email.</p>
                    </div>
                \`
            });
            console.log(\`Real email dispatched via Resend to \${user.email}\`);
        } else {
            console.log('\n======================================================');
            console.log('SIMULATED EMAIL HANDOFF MODE');
            console.log(\`To: \${user.email}\`);
            console.log(\`Verification Code: \${code}\`);
            console.log('======================================================\n');
        }

        res.json({ success: true, message: 'Verification code generated.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/verify-code', async (req, res) => {
    try {
        const { identifier, code } = req.body;
        if (!identifier || !code) return res.status(400).json({ error: 'Identifier and code required' });

        const user = await getQuery(\`SELECT user_id, name, email, password, student_id, role FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(student_id) = LOWER(?)\`, [identifier.trim(), identifier.trim()]);
        if (!user) return res.status(404).json({ error: 'Invalid verification code.' });

        const reset = await getQuery(\`SELECT * FROM password_resets WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1\`, 
            [user.user_id, code.trim(), new Date().toISOString()]);

        if (!reset) return res.status(400).json({ error: 'Invalid or expired verification code.' });

        // Mark as used
        await runQuery(\`UPDATE password_resets SET used = 1 WHERE reset_id = ?\`, [reset.reset_id]);

        // Return credentials
        res.json({ success: true, user: { name: user.name, email: user.email, password: user.password, role: user.role } });
    } catch (err) { res.status(500).json({ error: err.message }); }
});`;

server = server.replace(oldRetrieve, newRetrieve);

fs.writeFileSync('server.js', server, 'utf8');
console.log('Patched server.js with email verification flow');
