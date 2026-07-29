const { createClient } = require('@libsql/client');
require('dotenv').config();

async function run() {
    const db = createClient({
        url: process.env.TURSO_DATABASE_URL,
        authToken: process.env.TURSO_AUTH_TOKEN
    });
    
    await db.execute("DELETE FROM settings WHERE key = 'welcome_points'");
    console.log("Deleted duplicate welcome_points from DB");
}
run();
