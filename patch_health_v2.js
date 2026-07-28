const fs = require('fs');
let server = fs.readFileSync('server.js', 'utf8');

server = server.replace(
    'const ledgerCountRow = await getQuery(`SELECT COUNT(*) as count FROM ledger`);',
    'const ledgerCountRow = await getQuery(`SELECT COUNT(*) as count FROM points_ledger`);'
);

server = server.replace(
    'const voucherCountRow = await getQuery(`SELECT COUNT(*) as count FROM vouchers`);',
    'const voucherCountRow = await getQuery(`SELECT COUNT(*) as count FROM tuition_vouchers`);'
);

const oldStatsEndpoint = `app.get('/api/admin/traffic/stats', async (req, res) => {
    try {
        const totalHits = await getQuery(\`SELECT COUNT(*) as count FROM traffic_logs\`);
        const activeSessions = 3 + (totalHits.count % 7);
        res.json({
            total_hits: totalHits.count,
            active_sessions: activeSessions,
            security_level: 'High (SSL Secured)'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});`;

const newStatsEndpoint = `app.get('/api/admin/traffic/stats', async (req, res) => {
    try {
        const totalHits = await getQuery(\`SELECT COUNT(*) as count FROM traffic_logs\`);
        const activeSessions = 3 + (totalHits.count % 7);
        const isEphemeral = process.env.VERCEL && !process.env.TURSO_DATABASE_URL;
        res.json({
            total_hits: totalHits.count,
            active_sessions: activeSessions,
            security_level: 'High (SSL Secured)',
            is_ephemeral: isEphemeral
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});`;

server = server.replace(oldStatsEndpoint, newStatsEndpoint);

fs.writeFileSync('server.js', server, 'utf8');
console.log('Fixed health endpoint bugs in server.js');
