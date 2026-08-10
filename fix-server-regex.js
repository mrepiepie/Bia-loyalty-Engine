const fs = require('fs');

let js = fs.readFileSync('server.js', 'utf8');

// The problematic block in git currently looks like this (from lines 2738-2780 approx):
/*
// Admin: Issue Warning
app.post('/api/admin/users/:id/warn', requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body;
        const userId = req.params.id;
        
        await runQuery(
            "INSERT INTO user_warnings (user_id, admin_id, reason) VALUES (?, ?, ?)",
            [userId, req.user.user_id, reason || 'Violation of community guidelines']
        );
        
// Admin: Resolve Reports
app.post('/api/admin/users/:id/resolve-reports', requireAdmin, async (req, res) => {
    try {
        await runQuery("UPDATE community_reports SET status = 'Resolved' WHERE reported_user_id = ?", [req.params.id]);
        res.json({ message: 'Reports marked as resolved.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
        
        // Optional: Send email
        const user = await getQuery("SELECT email, name FROM users WHERE user_id = ?", [userId]);
        if (user) {
            try {
                await resend.emails.send({
                    from: 'admin@resend.dev',
                    to: user.email,
                    subject: 'BIA Community Hub: Official Warning',
                    html: `<p>Hi \${user.name},</p><p>You have received a warning from the community moderators.</p><p>Reason: \${reason}</p><p>Please adhere to the community guidelines.</p>`
                });
            } catch (e) { console.error("Failed to send warning email", e); }
        }
        
        res.json({ message: 'Warning issued successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to issue warning' });
    }
});
*/

// We will use regex to find this block and replace it cleanly.
const regex = /\/\/ Admin: Issue Warning[\s\S]*?(?=\/\/ Admin: Toggle Mute)/;

const correctCode = `// Admin: Issue Warning
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
                    html: \`<p>Hi \${user.name},</p><p>You have received a warning from the community moderators.</p><p>Reason: \${reason}</p><p>Please adhere to the community guidelines.</p>\`
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

`;

js = js.replace(regex, correctCode);
fs.writeFileSync('server.js', js);
console.log('Fixed server.js with regex replacement.');
