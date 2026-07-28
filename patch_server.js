const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

const badBlock = `        await runQuery(\`CREATE TABLE IF NOT EXISTS faq_submissions (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            student_id TEXT NOT NULL,
            student_name TEXT NOT NULL,
            email TEXT,
            timestamp INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
        )\`);`;

const goodBlock = `        await runQuery(\`CREATE TABLE IF NOT EXISTS faq_submissions (
            id TEXT PRIMARY KEY,
            question TEXT NOT NULL,
            student_id TEXT NOT NULL,
            student_name TEXT NOT NULL,
            email TEXT,
            timestamp INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            bookmarked INTEGER DEFAULT 0
        )\`);
        
        await runQuery(\`CREATE TABLE IF NOT EXISTS ip_blacklist (
            ip_address TEXT PRIMARY KEY,
            reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )\`);
        
        try {
            await runQuery(\`ALTER TABLE faq_submissions ADD COLUMN email TEXT\`);
        } catch (e) {}`;

if (code.includes(badBlock)) {
    code = code.replace(badBlock, goodBlock);
    fs.writeFileSync('server.js', code, 'utf8');
    console.log('Restored server.js');
} else {
    console.log('Could not find bad block');
}
