const { createClient } = require('@libsql/client');
const path = require('path');

const dbDir = path.join(__dirname, 'data');
const dbUrl = `file:${path.join(dbDir, 'loyalty.db')}`;

const db = createClient({
    url: dbUrl,
});

async function migrate() {
    try {
        console.log("Checking if users table needs migration...");
        
        try {
            await db.execute(`ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'student'`);
            console.log("Added role column to users table.");
        } catch (e) {
            console.log("Column 'role' may already exist:", e.message);
        }

        try {
            await db.execute(`ALTER TABLE users ADD COLUMN password_hash TEXT`);
            console.log("Added password_hash column to users table.");
        } catch (e) {
            console.log("Column 'password_hash' may already exist:", e.message);
        }
        
        await db.execute(`UPDATE users SET role = 'admin' WHERE user_id = 1`);
        console.log("Made user_id=1 an admin.");

        console.log("Migration complete!");
    } catch (err) {
        console.error("Migration failed:", err);
    }
}

migrate();
