require('dotenv').config();
const { createClient } = require('@libsql/client');

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
});

async function main() {
    const res = await db.execute('SELECT question, answer FROM faq_submissions WHERE is_public = 1 AND answer IS NOT NULL ORDER BY timestamp DESC');
    console.log(res.rows);
}
main();
