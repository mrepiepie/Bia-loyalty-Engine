const { createClient } = require('@libsql/client');
const path = require('path');

const dbDir = path.join(__dirname, 'data');
const dbUrl = `file:${path.join(dbDir, 'loyalty.db')}`;

const db = createClient({
    url: dbUrl,
});

async function migrate() {
    try {
        console.log("Migrating Community Platform tables...");
        
        await db.execute(`
            CREATE TABLE IF NOT EXISTS community_posts (
                post_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                upvotes INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        `);
        console.log("Created community_posts table.");

        await db.execute(`
            CREATE TABLE IF NOT EXISTS community_comments (
                comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                upvotes INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES community_posts(post_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        `);
        console.log("Created community_comments table.");

        await db.execute(`
            CREATE TABLE IF NOT EXISTS community_upvotes (
                user_id INTEGER NOT NULL,
                target_type TEXT NOT NULL, -- 'post' or 'comment'
                target_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, target_type, target_id),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        `);
        console.log("Created community_upvotes table.");

        console.log("Migration complete!");
    } catch (err) {
        console.error("Migration failed:", err);
    }
}

migrate();
