const fs = require('fs');

let code = fs.readFileSync('server.js', 'utf8');

const oldEndpoint = `app.post('/api/auth/retrieve-password', async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ error: 'Email or Student ID required' });
        const user = await getQuery(\`SELECT name, email, password, student_id, role FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(student_id) = LOWER(?)\`, [identifier.trim(), identifier.trim()]);
        if (!user) return res.status(404).json({ error: 'No account matched.' });
        res.json({ success: true, user });
    } catch (err) { res.status(500).json({ error: err.message }); }
});`;

const newEndpoint = `app.post('/api/auth/retrieve-password', async (req, res) => {
    try {
        const { identifier } = req.body;
        if (!identifier) return res.status(400).json({ error: 'Email or Student ID required' });
        const user = await getQuery(\`SELECT user_id, name, email FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(student_id) = LOWER(?)\`, [identifier.trim(), identifier.trim()]);
        if (!user) return res.status(404).json({ error: 'No account matched.' });

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 15 * 60000);
        await runQuery(\`INSERT INTO password_resets (user_id, code, expires_at) VALUES (?, ?, ?)\`, [user.user_id, code, expiresAt.toISOString()]);

        const resendApiKey = process.env.RESEND_API_KEY;
        if (resendApiKey && resendApiKey !== 'dummy') {
            await resend.emails.send({
                from: 'BIA Security <onboarding@resend.dev>',
                to: user.email,
                subject: 'BIA LoyaltyEngine - Verification Code',
                html: \`<div style="font-family: Arial, sans-serif; padding: 20px; background: #0A0B0E; color: #fff;">
                        <h2 style="color: #dfb15b;">Password Recovery</h2>
                        <p>Your verification code is: <b style="font-size: 24px; color: #4ade80;">\${code}</b></p>
                        <p>This code will expire in 15 minutes.</p>
                       </div>\`
            });
        } else {
            console.log('\\n======================================================');
            console.log('SIMULATED EMAIL HANDOFF MODE');
            console.log(\`To: \${user.email}\`);
            console.log(\`Verification Code: \${code}\`);
            console.log('======================================================\\n');
        }

        res.json({ success: true, message: 'Verification code generated.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/verify-code', async (req, res) => {
    try {
        const { identifier, code } = req.body;
        if (!identifier || !code) return res.status(400).json({ error: 'Identifier and code required' });

        const user = await getQuery(\`SELECT user_id, name, email, password FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(student_id) = LOWER(?)\`, [identifier.trim(), identifier.trim()]);
        if (!user) return res.status(404).json({ error: 'No account matched.' });

        const resetRecord = await getQuery(\`
            SELECT reset_id FROM password_resets 
            WHERE user_id = ? AND code = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP 
            ORDER BY created_at DESC LIMIT 1
        \`, [user.user_id, code]);

        if (!resetRecord) {
            return res.status(400).json({ error: 'Invalid or expired verification code.' });
        }

        await runQuery(\`UPDATE password_resets SET used = 1 WHERE reset_id = ?\`, [resetRecord.reset_id]);
        res.json({ success: true, user });
    } catch (err) { res.status(500).json({ error: err.message }); }
});`;

if (code.includes(oldEndpoint)) {
    code = code.replace(oldEndpoint, newEndpoint);
    fs.writeFileSync('server.js', code, 'utf8');
    console.log("Successfully patched server.js");
} else {
    console.log("Failed to find old endpoint!");
}
