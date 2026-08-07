const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { createClient } = require('@libsql/client');
require('dotenv').config();

// 1. Check if Turso credentials exist
const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoAuth = process.env.TURSO_AUTH_TOKEN;

if (!tursoUrl) {
    console.error("ERROR: Please create a .env file and add your TURSO_DATABASE_URL and TURSO_AUTH_TOKEN");
    process.exit(1);
}

// 2. Connect to local SQLite
const localDbPath = 'database.sqlite';
if (!fs.existsSync(localDbPath)) {
    console.error(`ERROR: Could not find local database at ${localDbPath}`);
    process.exit(1);
}

console.log("Connecting to local database...");
const localDb = new sqlite3.Database(localDbPath);

// 3. Connect to Turso
console.log("Connecting to Turso cloud database...");
const tursoDb = createClient({
    url: tursoUrl,
    authToken: tursoAuth
});

async function migrateData() {
    try {
        // Read local users
        localDb.all("SELECT * FROM users", async (err, users) => {
            if (err) throw err;
            console.log(`Found ${users.length} users to migrate.`);
            
            for (const user of users) {
                try {
                    await tursoDb.execute({
                        sql: "INSERT OR IGNORE INTO users (user_id, name, email, password, role, student_id, current_tier, points_balance, is_muted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        args: [user.user_id, user.name, user.email, user.password, user.role, user.student_id, user.current_tier, user.points_balance, user.is_muted || 0]
                    });
                } catch(e) {
                    console.log(`Failed to migrate user ${user.email}: ${e.message}`);
                }
            }
            console.log("Users migrated.");

            // Read local posts
            localDb.all("SELECT * FROM community_posts", async (err, posts) => {
                if (err) throw err;
                console.log(`Found ${posts.length} posts to migrate.`);
                
                for (const post of posts) {
                    try {
                        await tursoDb.execute({
                            sql: "INSERT OR IGNORE INTO community_posts (post_id, user_id, title, content, is_anonymous, image_url, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                            args: [post.post_id, post.user_id, post.title, post.content, post.is_anonymous, post.image_url, post.created_at]
                        });
                    } catch(e) {
                        console.log(`Failed to migrate post ${post.post_id}: ${e.message}`);
                    }
                }
                console.log("Posts migrated.");
                
                // Read local comments
                localDb.all("SELECT * FROM community_comments", async (err, comments) => {
                    if (err) throw err;
                    console.log(`Found ${comments.length} comments to migrate.`);
                    
                    for (const comment of comments) {
                        try {
                            await tursoDb.execute({
                                sql: "INSERT OR IGNORE INTO community_comments (comment_id, post_id, user_id, content, created_at) VALUES (?, ?, ?, ?, ?)",
                                args: [comment.comment_id, comment.post_id, comment.user_id, comment.content, comment.created_at]
                            });
                        } catch(e) {
                            console.log(`Failed to migrate comment ${comment.comment_id}: ${e.message}`);
                        }
                    }
                    console.log("Comments migrated.");
                    console.log("✅ MIGRATION COMPLETE! Your old data is now in Turso.");
                    process.exit(0);
                });
            });
        });
    } catch (e) {
        console.error("Migration failed:", e);
    }
}

migrateData();
