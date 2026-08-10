const express = require('express');
const { createClient } = require('@libsql/client');
const db = createClient({ url: 'file:test_app.db' });

async function init() {
    await db.execute(`CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        role TEXT DEFAULT 'student', student_id TEXT UNIQUE, referral_code TEXT UNIQUE, current_tier TEXT DEFAULT 'Bronze',
        referral_count INTEGER DEFAULT 0, points_balance INTEGER DEFAULT 0, programme TEXT DEFAULT 'General',
        is_muted INTEGER DEFAULT 0, muted_until TEXT DEFAULT NULL
    )`);
    
    await db.execute(`CREATE TABLE IF NOT EXISTS community_posts (
        post_id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_anonymous INTEGER DEFAULT 0,
        tags TEXT DEFAULT '[]',
        image_url TEXT,
        is_locked INTEGER DEFAULT 0,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        accepted_answer_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id)
    )`);
    
    // Create a dummy user
    try {
        await db.execute("INSERT INTO users (user_id, name, email, password) VALUES (1, 'Test', 'test@test.com', 'pwd')");
    } catch(e) {}
    
    // Simulate the POST payload
    const title = "Test Post";
    const content = "Hello World";
    const is_anonymous = false;
    const tags = '["General"]';
    const image_base64 = null;
    
    try {
        const res = await db.execute({
            sql: 'INSERT INTO community_posts (user_id, title, content, is_anonymous, tags, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            args: [1, title, content, is_anonymous ? 1 : 0, tags || '[]', image_base64 || null]
        });
        console.log("Post inserted:", res);
        
        const count = await db.execute("SELECT (SELECT COUNT(*) FROM community_posts) as total_posts");
        console.log("Stats count:", count.rows[0]);
    } catch (e) {
        console.error("Insert failed:", e);
    }
}
init();
