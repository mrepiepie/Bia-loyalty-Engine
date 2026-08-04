const { createClient } = require('@libsql/client');

async function testDb() {
    const db = createClient({ url: 'file:data/loyalty.db' });
    
    // Create a dummy user
    const userRes = await db.execute({ sql: "SELECT user_id FROM users WHERE email='test@test.com'", args: [] });
    const userId = userRes.rows[0].user_id;

    // Create table if not exists (simulate initDb)
    await db.execute({ sql: `CREATE TABLE IF NOT EXISTS community_posts (
        post_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_anonymous INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        image_url TEXT,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        accepted_answer_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`, args: [] });
    
    await db.execute({ sql: `CREATE TABLE IF NOT EXISTS community_comments (
        comment_id INTEGER PRIMARY KEY AUTOINCREMENT,
        post_id INTEGER,
        user_id INTEGER,
        content TEXT,
        is_anonymous INTEGER DEFAULT 0,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        parent_comment_id INTEGER
    )`, args: []});

    await db.execute({ sql: `CREATE TABLE IF NOT EXISTS community_votes (
        vote_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        vote_value INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`, args: []});

    // Insert a post
    const insertRes = await db.execute({ sql: 'INSERT INTO community_posts (user_id, title, content, is_anonymous, tags, image_url) VALUES (?, ?, ?, ?, ?, ?)', args: [userId, 'Test Title', 'Test Content', 0, '["Home", "General"]', null] });
    console.log("Insert result:", insertRes);

    // Fetch posts
    const orderBy = '(p.upvotes - p.downvotes) + comment_count DESC, p.created_at DESC';
    try {
        const postsRes = await db.execute({ sql: `
            SELECT p.*, u.name, u.programme,
            (SELECT COUNT(*) FROM community_comments WHERE post_id = p.post_id) as comment_count,
            EXISTS(SELECT 1 FROM community_votes WHERE target_type='post' AND target_id=p.post_id AND user_id=? AND vote_value=1) as user_has_upvoted,
            EXISTS(SELECT 1 FROM community_votes WHERE target_type='post' AND target_id=p.post_id AND user_id=? AND vote_value=-1) as user_has_downvoted
            FROM community_posts p
            JOIN users u ON p.user_id = u.user_id
            ORDER BY ${orderBy}
        `, args: [userId, userId] });
        
        console.log("Fetched posts:", postsRes.rows);
    } catch(err) {
        console.error("SQL Error fetching posts:", err);
    }
}

testDb();
