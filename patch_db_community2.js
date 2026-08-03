const { createClient } = require('@libsql/client');
const path = require('path');

const dbDir = path.join(__dirname, 'data');
const dbUrl = `file:${path.join(dbDir, 'loyalty.db')}`;

const db = createClient({
    url: dbUrl,
});

async function runQuery(query, params = []) {
    return await db.execute({ sql: query, args: params });
}

async function patchDb() {
    try {
        console.log("Applying Database Patches for Reddit/Quora platform...");

        // Safely add columns
        const columns = [
            "ALTER TABLE community_posts ADD COLUMN is_anonymous INTEGER DEFAULT 0",
            "ALTER TABLE community_posts ADD COLUMN accepted_answer_id INTEGER DEFAULT NULL",
            "ALTER TABLE community_posts ADD COLUMN tags TEXT DEFAULT '[]'",
            "ALTER TABLE community_posts ADD COLUMN downvotes INTEGER DEFAULT 0",
            "ALTER TABLE community_comments ADD COLUMN is_anonymous INTEGER DEFAULT 0",
            "ALTER TABLE community_comments ADD COLUMN parent_comment_id INTEGER DEFAULT NULL",
            "ALTER TABLE community_comments ADD COLUMN downvotes INTEGER DEFAULT 0"
        ];

        for (const col of columns) {
            try {
                await runQuery(col);
                console.log("Successfully added column:", col);
            } catch (err) {
                if (err.message.includes("duplicate column name")) {
                    console.log("Column already exists, skipping:", col);
                } else {
                    console.error("Error adding column:", col, err.message);
                }
            }
        }
        
        await runQuery(`
            CREATE TABLE IF NOT EXISTS community_votes (
                vote_id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                target_type TEXT NOT NULL,
                target_id INTEGER NOT NULL,
                vote_value INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, target_type, target_id)
            )
        `);
        console.log("Created community_votes table.");

        console.log("Database patch completed successfully.");
    } catch (e) {
        console.error("Critical DB error:", e);
    }
}

patchDb();
