const { createClient } = require('@libsql/client');
const fs = require('fs');

async function test() {
    const db = createClient({ url: 'file:test.db' });
    
    await db.execute("CREATE TABLE IF NOT EXISTS community_posts (user_id INTEGER)");
    await db.execute("CREATE TABLE IF NOT EXISTS community_comments (user_id INTEGER)");
    await db.execute("INSERT INTO community_posts (user_id) VALUES (1)");
    
    try {
        const res = await db.execute("SELECT (SELECT COUNT(*) FROM community_posts) as total_posts, (SELECT COUNT(*) FROM community_comments) as total_comments, (SELECT COUNT(DISTINCT user_id) FROM (SELECT user_id FROM community_posts UNION SELECT user_id FROM community_comments)) as active_contributors");
        console.log("Success:", res.rows);
    } catch (e) {
        console.error("Error:", e);
    }
}
test();
