const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

const communityEndpoints = `
// ==========================================
// COMMUNITY PLATFORM ROUTES
// ==========================================

// Get all posts with user info
app.get('/api/community/posts', requireAuth, async (req, res) => {
    try {
        const posts = await getQueryAll(\`
            SELECT p.*, u.name, u.programme,
            (SELECT COUNT(*) FROM community_comments WHERE post_id = p.post_id) as comment_count,
            EXISTS(SELECT 1 FROM community_upvotes WHERE target_type='post' AND target_id=p.post_id AND user_id=?) as user_has_upvoted
            FROM community_posts p
            JOIN users u ON p.user_id = u.user_id
            ORDER BY p.created_at DESC
        \`, [req.user.user_id]);
        res.json({ posts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new post (Awards 10 points)
app.post('/api/community/posts', requireAuth, async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

        await db.transaction('write');
        try {
            await runQuery('INSERT INTO community_posts (user_id, title, content) VALUES (?, ?, ?)', [req.user.user_id, title, content]);
            // Award 10 points for posting
            await runQuery('UPDATE users SET points_balance = points_balance + 10 WHERE user_id = ?', [req.user.user_id]);
            await runQuery('INSERT INTO points_ledger (user_id, action_type, points, description) VALUES (?, ?, ?, ?)', 
                [req.user.user_id, 'EARN', 10, 'Created a community post']);
            
            await db.execute('COMMIT');
            res.json({ message: 'Post created successfully and you earned 10 points!' });
        } catch (e) {
            await db.execute('ROLLBACK');
            throw e;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Upvote a post
app.post('/api/community/posts/:id/upvote', requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        
        await db.transaction('write');
        try {
            // Check if already upvoted
            const exists = await getQuery("SELECT 1 FROM community_upvotes WHERE user_id=? AND target_type='post' AND target_id=?", [req.user.user_id, postId]);
            
            if (exists) {
                // Remove upvote
                await runQuery("DELETE FROM community_upvotes WHERE user_id=? AND target_type='post' AND target_id=?", [req.user.user_id, postId]);
                await runQuery("UPDATE community_posts SET upvotes = upvotes - 1 WHERE post_id=?", [postId]);
            } else {
                // Add upvote
                await runQuery("INSERT INTO community_upvotes (user_id, target_type, target_id) VALUES (?, 'post', ?)", [req.user.user_id, postId]);
                await runQuery("UPDATE community_posts SET upvotes = upvotes + 1 WHERE post_id=?", [postId]);
                
                // Award the author of the post 5 points
                const post = await getQuery("SELECT user_id FROM community_posts WHERE post_id=?", [postId]);
                if (post && post.user_id !== req.user.user_id) {
                    await runQuery('UPDATE users SET points_balance = points_balance + 5 WHERE user_id = ?', [post.user_id]);
                    await runQuery('INSERT INTO points_ledger (user_id, action_type, points, description) VALUES (?, ?, ?, ?)', 
                        [post.user_id, 'EARN', 5, 'Received an upvote on your post']);
                }
            }
            
            await db.execute('COMMIT');
            res.json({ message: exists ? 'Upvote removed' : 'Upvote added' });
        } catch (e) {
            await db.execute('ROLLBACK');
            throw e;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get comments for a post
app.get('/api/community/posts/:id/comments', requireAuth, async (req, res) => {
    try {
        const comments = await getQueryAll(\`
            SELECT c.*, u.name,
            EXISTS(SELECT 1 FROM community_upvotes WHERE target_type='comment' AND target_id=c.comment_id AND user_id=?) as user_has_upvoted
            FROM community_comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        \`, [req.user.user_id, req.params.id]);
        res.json({ comments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a comment (Awards 5 points)
app.post('/api/community/posts/:id/comments', requireAuth, async (req, res) => {
    try {
        const { content } = req.body;
        const postId = req.params.id;
        if (!content) return res.status(400).json({ error: 'Content required' });

        await db.transaction('write');
        try {
            await runQuery('INSERT INTO community_comments (post_id, user_id, content) VALUES (?, ?, ?)', [postId, req.user.user_id, content]);
            
            // Award 5 points for commenting
            await runQuery('UPDATE users SET points_balance = points_balance + 5 WHERE user_id = ?', [req.user.user_id]);
            await runQuery('INSERT INTO points_ledger (user_id, action_type, points, description) VALUES (?, ?, ?, ?)', 
                [req.user.user_id, 'EARN', 5, 'Contributed a comment']);
            
            await db.execute('COMMIT');
            res.json({ message: 'Comment added successfully and you earned 5 points!' });
        } catch (e) {
            await db.execute('ROLLBACK');
            throw e;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
`;

if (!content.includes('/api/community/posts')) {
    const target = "const PORT = process.env.PORT || 3000;";
    content = content.replace(target, communityEndpoints + "\n" + target);
    fs.writeFileSync('server.js', content);
    console.log("Patched server.js with Community routes.");
} else {
    console.log("Already patched.");
}
