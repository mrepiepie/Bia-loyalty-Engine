const { createClient } = require('@libsql/client');

async function test() {
    const db = createClient({ url: 'file:test.db' });
    const res = await db.execute("SELECT COUNT(*) as count FROM community_posts");
    const row = res.rows[0];
    console.log("Row:", row);
    console.log("Type of count:", typeof row.count);
    
    try {
        console.log("JSON:", JSON.stringify(row));
    } catch (e) {
        console.error("JSON Error:", e.message);
    }
}
test();
