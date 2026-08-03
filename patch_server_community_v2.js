const fs = require('fs');

let content = fs.readFileSync('server.js', 'utf8');

// Inject optionalAuth middleware if it doesn't exist
if (!content.includes('const optionalAuth =')) {
    const requireAuthRegex = /const requireAuth = [^\}]+;\n\};/s;
    const match = content.match(requireAuthRegex);
    if (match) {
        const optionalAuthCode = `\nconst optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        req.user = null;
        return next();
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        req.user = null;
        return next();
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            req.user = null;
        } else {
            req.user = decoded;
        }
        next();
    });
};`;
        content = content.replace(match[0], match[0] + optionalAuthCode);
    }
}

// Extract the exact block to replace
const startMarker = "// ==========================================\n// COMMUNITY PLATFORM ROUTES";
const endMarker = "// ==========================================\n\nconst PORT";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const newRoutes = `// ==========================================
// COMMUNITY PLATFORM ROUTES
// ==========================================

// Get all posts (Publicly readable, but needs optionalAuth for upvote status)
app.get('/api/community/posts', optionalAuth, async (req, res) => {
    try {
        const userId = req.user ? req.user.user_id : -1;
        const sortBy = req.query.sort || 'new';
        let orderBy = 'p.created_at DESC';
        if (sortBy === 'hot') orderBy = '(p.upvotes - p.downvotes) + p.comment_count DESC, p.created_at DESC';
        if (sortBy === 'top') orderBy = '(p.upvotes - p.downvotes) DESC, p.created_at DESC';

        const posts = await getQueryAll(\`
            SELECT p.*, u.name, u.programme,
            (SELECT COUNT(*) FROM community_comments WHERE post_id = p.post_id) as comment_count,
            EXISTS(SELECT 1 FROM community_votes WHERE target_type='post' AND target_id=p.post_id AND user_id=? AND vote_value=1) as user_has_upvoted,
            EXISTS(SELECT 1 FROM community_votes WHERE target_type='post' AND target_id=p.post_id AND user_id=? AND vote_value=-1) as user_has_downvoted
            FROM community_posts p
            JOIN users u ON p.user_id = u.user_id
            ORDER BY \${orderBy}
        \`, [userId, userId]);
        
        // Sanitize anonymous posts
        posts.forEach(p => {
            if (p.is_anonymous) {
                p.name = 'Anonymous Student';
                p.programme = '';
            }
        });
        
        res.json({ posts });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create a new post
app.post('/api/community/posts', requireAuth, async (req, res) => {
    try {
        const { title, content, is_anonymous, tags } = req.body;
        if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

        await db.transaction('write');
        try {
            await runQuery('INSERT INTO community_posts (user_id, title, content, is_anonymous, tags) VALUES (?, ?, ?, ?, ?)', 
                [req.user.user_id, title, content, is_anonymous ? 1 : 0, tags || '[]']);
            
            await db.execute('COMMIT');
            res.json({ message: 'Post created successfully!' });
        } catch (e) {
            await db.execute('ROLLBACK');
            throw e;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Vote on a post (up or down)
app.post('/api/community/posts/:id/vote', requireAuth, async (req, res) => {
    try {
        const postId = req.params.id;
        const { value } = req.body; // 1 for upvote, -1 for downvote, 0 to remove
        if (value !== 1 && value !== -1 && value !== 0) return res.status(400).json({ error: 'Invalid vote value' });
        
        await db.transaction('write');
        try {
            const currentVote = await getQuery("SELECT vote_value FROM community_votes WHERE user_id=? AND target_type='post' AND target_id=?", [req.user.user_id, postId]);
            
            // Revert old vote stats if it existed
            if (currentVote) {
                if (currentVote.vote_value === 1) await runQuery("UPDATE community_posts SET upvotes = upvotes - 1 WHERE post_id=?", [postId]);
                if (currentVote.vote_value === -1) await runQuery("UPDATE community_posts SET downvotes = downvotes - 1 WHERE post_id=?", [postId]);
                await runQuery("DELETE FROM community_votes WHERE user_id=? AND target_type='post' AND target_id=?", [req.user.user_id, postId]);
            }
            
            // Apply new vote if not 0
            if (value !== 0) {
                await runQuery("INSERT INTO community_votes (user_id, target_type, target_id, vote_value) VALUES (?, 'post', ?, ?)", [req.user.user_id, postId, value]);
                if (value === 1) await runQuery("UPDATE community_posts SET upvotes = upvotes + 1 WHERE post_id=?", [postId]);
                if (value === -1) await runQuery("UPDATE community_posts SET downvotes = downvotes + 1 WHERE post_id=?", [postId]);
                
                // Award points for upvotes only
                if (value === 1 && (!currentVote || currentVote.vote_value !== 1)) {
                    const post = await getQuery("SELECT user_id FROM community_posts WHERE post_id=?", [postId]);
                    if (post && post.user_id !== req.user.user_id) {
                        await runQuery('UPDATE users SET points_balance = points_balance + 5 WHERE user_id = ?', [post.user_id]);
                        await runQuery('INSERT INTO points_ledger (user_id, action_type, points, description) VALUES (?, ?, ?, ?)', 
                            [post.user_id, 'EARN', 5, 'Received an upvote on your post']);
                    }
                }
            }
            
            await db.execute('COMMIT');
            res.json({ message: 'Vote recorded' });
        } catch (e) {
            await db.execute('ROLLBACK');
            throw e;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Accept an answer (Awards 50 points)
app.post('/api/community/posts/:postId/accept/:commentId', requireAuth, async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        
        await db.transaction('write');
        try {
            // Verify ownership of the post
            const post = await getQuery("SELECT user_id, accepted_answer_id FROM community_posts WHERE post_id=?", [postId]);
            if (!post) throw new Error("Post not found");
            if (post.user_id !== req.user.user_id) throw new Error("Only the original author can accept an answer");
            if (post.accepted_answer_id) throw new Error("An answer has already been accepted for this post");
            
            // Verify comment exists
            const comment = await getQuery("SELECT user_id FROM community_comments WHERE comment_id=? AND post_id=?", [commentId, postId]);
            if (!comment) throw new Error("Comment not found on this post");
            if (comment.user_id === req.user.user_id) throw new Error("You cannot accept your own answer");
            
            // Update post and award massive bounty
            await runQuery("UPDATE community_posts SET accepted_answer_id=? WHERE post_id=?", [commentId, postId]);
            await runQuery('UPDATE users SET points_balance = points_balance + 50 WHERE user_id = ?', [comment.user_id]);
            await runQuery('INSERT INTO points_ledger (user_id, action_type, points, description) VALUES (?, ?, ?, ?)', 
                [comment.user_id, 'EARN', 50, 'Your answer was Accepted by the author']);
                
            await db.execute('COMMIT');
            res.json({ message: 'Answer accepted successfully!' });
        } catch (e) {
            await db.execute('ROLLBACK');
            res.status(400).json({ error: e.message });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get comments for a post
app.get('/api/community/posts/:id/comments', optionalAuth, async (req, res) => {
    try {
        const userId = req.user ? req.user.user_id : -1;
        const comments = await getQueryAll(\`
            SELECT c.*, u.name,
            EXISTS(SELECT 1 FROM community_votes WHERE target_type='comment' AND target_id=c.comment_id AND user_id=? AND vote_value=1) as user_has_upvoted,
            EXISTS(SELECT 1 FROM community_votes WHERE target_type='comment' AND target_id=c.comment_id AND user_id=? AND vote_value=-1) as user_has_downvoted
            FROM community_comments c
            JOIN users u ON c.user_id = u.user_id
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        \`, [userId, userId, req.params.id]);
        
        comments.forEach(c => {
            if (c.is_anonymous) {
                c.name = 'Anonymous Student';
            }
        });
        
        res.json({ comments });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a comment (Awards 5 points)
app.post('/api/community/posts/:id/comments', requireAuth, async (req, res) => {
    try {
        const { content, is_anonymous, parent_comment_id } = req.body;
        const postId = req.params.id;
        if (!content) return res.status(400).json({ error: 'Content required' });

        await db.transaction('write');
        try {
            await runQuery('INSERT INTO community_comments (post_id, user_id, content, is_anonymous, parent_comment_id) VALUES (?, ?, ?, ?, ?)', 
                [postId, req.user.user_id, content, is_anonymous ? 1 : 0, parent_comment_id || null]);
            
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

// Vote on a comment
app.post('/api/community/comments/:id/vote', requireAuth, async (req, res) => {
    try {
        const commentId = req.params.id;
        const { value } = req.body; // 1 for upvote, -1 for downvote, 0 to remove
        if (value !== 1 && value !== -1 && value !== 0) return res.status(400).json({ error: 'Invalid vote value' });
        
        await db.transaction('write');
        try {
            const currentVote = await getQuery("SELECT vote_value FROM community_votes WHERE user_id=? AND target_type='comment' AND target_id=?", [req.user.user_id, commentId]);
            
            if (currentVote) {
                if (currentVote.vote_value === 1) await runQuery("UPDATE community_comments SET upvotes = upvotes - 1 WHERE comment_id=?", [commentId]);
                if (currentVote.vote_value === -1) await runQuery("UPDATE community_comments SET downvotes = downvotes - 1 WHERE comment_id=?", [commentId]);
                await runQuery("DELETE FROM community_votes WHERE user_id=? AND target_type='comment' AND target_id=?", [req.user.user_id, commentId]);
            }
            
            if (value !== 0) {
                await runQuery("INSERT INTO community_votes (user_id, target_type, target_id, vote_value) VALUES (?, 'comment', ?, ?)", [req.user.user_id, commentId, value]);
                if (value === 1) await runQuery("UPDATE community_comments SET upvotes = upvotes + 1 WHERE comment_id=?", [commentId]);
                if (value === -1) await runQuery("UPDATE community_comments SET downvotes = downvotes + 1 WHERE comment_id=?", [commentId]);
            }
            
            await db.execute('COMMIT');
            res.json({ message: 'Vote recorded' });
        } catch (e) {
            await db.execute('ROLLBACK');
            throw e;
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});\n\n`;

    content = content.substring(0, startIndex) + newRoutes + content.substring(endIndex);
    fs.writeFileSync('server.js', content);
    console.log('Successfully replaced Community routes in server.js');
} else {
    console.error('Could not find markers in server.js');
}
