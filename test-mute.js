const http = require('http');
const sqlite3 = require('sqlite3').verbose();

async function runTest() {
    const db = new sqlite3.Database('./data/loyalty.db');

    console.log("=== STARTING TIMED MUTE TEST ===");
    
    // 1. Manually add a muted_until directly in the database for Sarah
    console.log("1. Muting Sarah (user 1) for 1 hour via DB...");
    const mutedUntil = new Date(Date.now() + 3600000).toISOString();
    
    await new Promise((resolve) => {
        db.run("UPDATE users SET is_muted = 1, muted_until = ? WHERE user_id = 1", [mutedUntil], resolve);
    });

    // 2. We don't have a valid login for Sarah due to plaintext DB bug, 
    // but we CAN test the MUTE logic by creating a dummy JWT token!
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ user_id: 1, role: 'student' }, 'super-secret-bia-key-2026', { expiresIn: '7d' });

    // 3. Sarah attempts to post
    console.log("2. Sarah attempting to publish a post...");
    
    const fetchLocal = (path, method, body, token) => {
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3001,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            }, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data) }));
            });
            req.on('error', reject);
            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    };

    const postRes = await fetchLocal('/api/community/posts', 'POST', {
        title: "Hello World",
        content: "This is a test post.",
        is_anonymous: false
    }, token);

    console.log(`Post attempt result: Status ${postRes.status}`);
    console.log(`Server response: ${postRes.data.error}`);

    if (postRes.status === 403 && postRes.data.error.includes("temporarily muted")) {
        console.log("✅ TEST PASSED: The server successfully blocked the muted user from posting!");
    } else {
        console.log("❌ TEST FAILED: The user was not blocked as expected.");
    }
}

runTest();
