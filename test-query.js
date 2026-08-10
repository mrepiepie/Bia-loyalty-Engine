// local test script
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS community_posts (
        post_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        content TEXT,
        tags TEXT,
        is_anonymous INTEGER DEFAULT 0,
        image_url TEXT,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_locked INTEGER DEFAULT 0,
        accepted_answer_id INTEGER
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS community_comments (
        comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        user_id INTEGER,
        parent_comment_id INTEGER,
        content TEXT,
        is_anonymous INTEGER DEFAULT 0,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (post_id) REFERENCES community_posts(post_id) ON DELETE CASCADE,
        FOREIGN KEY (parent_comment_id) REFERENCES community_comments(comment_id) ON DELETE CASCADE
    )`);
    
    db.run(`INSERT INTO community_posts (user_id, title, content) VALUES (1, 'Test Post', 'Test Content')`);
    
    db.get("SELECT (SELECT COUNT(*) FROM community_posts) as total_posts, (SELECT COUNT(*) FROM community_comments) as total_comments, (SELECT COUNT(DISTINCT user_id) FROM (SELECT user_id FROM community_posts UNION SELECT user_id FROM community_comments)) as active_contributors", (err, row) => {
        if (err) console.error(err);
        console.log("Stats query result:", row);
    });
});
