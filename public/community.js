// community.js

let currentUser = null;
let currentSort = 'hot';

// Helper for Auth
function requireAuth(callback) {
    if (currentUser) {
        callback();
    } else {
        window.location.href = '/';
    }
}

async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        const res = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            currentUser = await res.json();
            return currentUser;
        }
    } catch (e) {
        console.error('Auth check failed', e);
    }
    return null;
}

function updateNav() {
    const navAuthState = document.getElementById('nav-auth-state');
    if (currentUser) {
        const isAdmin = currentUser.role === 'admin';
        navAuthState.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <div style="text-align: right; line-height: 1.2;">
                    <div style="color: #fff; font-weight: 600; font-size: 0.9rem;">${currentUser.name} ${isAdmin ? '<span style="color: #dfb15b; font-size: 0.7rem; margin-left: 4px; padding: 2px 6px; border: 1px solid #dfb15b; border-radius: 4px;">ADMIN</span>' : ''}</div>
                </div>
                <a href="/" class="btn btn-secondary btn-sm">Dashboard</a>
            </div>
        `;
        document.getElementById('create-post-box').style.display = 'block';
        
        if (isAdmin) {
            document.getElementById('admin-moderation-panel').style.display = 'block';
            loadAdminCommunityStats();
        }
    } else {
        navAuthState.innerHTML = `<a href="/" class="btn btn-primary btn-sm">Sign In / Register</a>`;
        document.getElementById('create-post-box').style.display = 'none';
    }
}

async function fetchPosts() {
    const feed = document.getElementById('feed-container');
    feed.innerHTML = '<div style="text-align: center; padding: 3rem; color: #888;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>';
    
    const headers = {};
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    try {
        const res = await fetch(`/api/community/posts?sort=${currentSort}`, { headers });
        const data = await res.json();
        
        feed.innerHTML = '';
        if (data.posts && data.posts.length > 0) {
            data.posts.forEach(post => {
                feed.appendChild(createPostElement(post));
            });
        } else {
            feed.innerHTML = '<div style="text-align:center; color:#888; padding: 2rem;">No posts found. Be the first to start a discussion!</div>';
        }
    } catch (err) {
        feed.innerHTML = `<div style="color:#ff4b4b; text-align:center;">Failed to load posts: ${err.message}</div>`;
    }
}

function createPostElement(post) {
    const div = document.createElement('div');
    div.className = 'post-card';
    
    const upvoted = post.user_has_upvoted ? 'upvoted' : '';
    const downvoted = post.user_has_downvoted ? 'downvoted' : '';
    const score = post.upvotes - post.downvotes;
    
    const tags = JSON.parse(post.tags || '[]');
    const tagsHtml = tags.map(t => `<span class="tag-pill">${t}</span>`).join('');
    
    let acceptedHtml = '';
    if (post.accepted_answer_id) {
        acceptedHtml = `<div style="background: rgba(223, 177, 91, 0.1); color: #dfb15b; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"><i class="fa-solid fa-check-circle"></i> Answered</div>`;
    }

    const safeHtml = DOMPurify.sanitize(marked.parse(post.content));

    div.innerHTML = `
        <div class="vote-col">
            <button class="vote-btn ${upvoted}" onclick="handleVote('post', ${post.post_id}, 1)"><i class="fa-solid fa-arrow-up"></i></button>
            <span style="font-weight: 700; margin: 0.5rem 0; color: ${score > 0 ? '#66fcf1' : (score < 0 ? '#ff4b4b' : '#fff')}">${score}</span>
            <button class="vote-btn ${downvoted}" onclick="handleVote('post', ${post.post_id}, -1)"><i class="fa-solid fa-arrow-down"></i></button>
        </div>
        <div class="post-content-area">
            ${acceptedHtml}
            <div class="post-meta">
                <span style="color: #fff; font-weight: 600;">${post.name}</span>
                ${post.programme ? `<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">${post.programme}</span>` : ''}
                <span>•</span>
                <span>${new Date(post.created_at).toLocaleDateString()}</span>
                ${tagsHtml ? `<span>•</span> ${tagsHtml}` : ''}
            </div>
            <h3 class="post-title">${post.title}</h3>
            <div class="post-body markdown-body">${safeHtml}</div>
            
            <div class="post-actions">
                <button class="action-btn" onclick="toggleComments(${post.post_id})">
                    <i class="fa-regular fa-message"></i> ${post.comment_count} Comments
                </button>
                ${currentUser && currentUser.user_id === post.user_id && !post.accepted_answer_id ? 
                    `<span style="color: #dfb15b; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-crown"></i> Accept an answer to help others!
                    </span>` : ''}
            </div>
            
            <div id="comments-${post.post_id}" style="display: none; margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
                <div id="comments-list-${post.post_id}"></div>
                <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                    <input type="text" id="comment-input-${post.post_id}" class="input-field" placeholder="Add a comment..." style="flex:1;" onkeypress="if(event.key === 'Enter') submitComment(${post.post_id})">
                    <button class="btn btn-primary" onclick="submitComment(${post.post_id})">Reply</button>
                </div>
            </div>
        </div>
    `;
    return div;
}

window.handleVote = function(type, id, value) {
    requireAuth(async () => {
        const token = localStorage.getItem('token');
        try {
            await fetch(`/api/community/${type}s/${id}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ value })
            });
            // Re-fetch to update state
            fetchPosts();
        } catch (e) {
            console.error('Vote failed', e);
        }
    });
};

window.toggleComments = async function(postId) {
    const container = document.getElementById(`comments-${postId}`);
    if (container.style.display === 'none') {
        container.style.display = 'block';
        loadComments(postId);
    } else {
        container.style.display = 'none';
    }
};

async function loadComments(postId) {
    const list = document.getElementById(`comments-list-${postId}`);
    list.innerHTML = 'Loading comments...';
    
    const headers = {};
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    try {
        const res = await fetch(`/api/community/posts/${postId}/comments`, { headers });
        const data = await res.json();
        
        list.innerHTML = '';
        if (data.comments && data.comments.length > 0) {
            data.comments.forEach(c => {
                const div = document.createElement('div');
                div.style.cssText = 'padding: 0.75rem; background: rgba(0,0,0,0.2); border-radius: 8px; margin-bottom: 0.5rem;';
                
                const upvoted = c.user_has_upvoted ? 'upvoted' : '';
                const downvoted = c.user_has_downvoted ? 'downvoted' : '';
                const score = c.upvotes - c.downvotes;
                
                const acceptBtn = (currentUser && list.closest('.post-card').querySelector('.fa-crown') /* bit hacky check if author hasn't accepted yet */ && currentUser.name !== c.name) ?
                    `<button class="btn btn-sm" style="background: rgba(223, 177, 91, 0.2); color: #dfb15b; border: 1px solid #dfb15b; padding: 2px 8px; font-size: 0.7rem;" onclick="acceptAnswer(${postId}, ${c.comment_id})"><i class="fa-solid fa-check"></i> Accept as Answer</button>` : '';

                div.innerHTML = `
                    <div style="font-size: 0.8rem; color: #888; margin-bottom: 0.25rem;">
                        <strong style="color: #fff;">${c.name}</strong> • ${new Date(c.created_at).toLocaleDateString()}
                        ${acceptBtn}
                    </div>
                    <div style="font-size: 0.95rem; margin-bottom: 0.5rem;">${c.content}</div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button class="vote-btn ${upvoted}" style="font-size: 0.9rem;" onclick="handleVote('comment', ${c.comment_id}, 1)"><i class="fa-solid fa-arrow-up"></i></button>
                        <span style="font-size: 0.9rem; font-weight: bold; color: ${score > 0 ? '#66fcf1' : (score < 0 ? '#ff4b4b' : '#fff')}">${score}</span>
                        <button class="vote-btn ${downvoted}" style="font-size: 0.9rem;" onclick="handleVote('comment', ${c.comment_id}, -1)"><i class="fa-solid fa-arrow-down"></i></button>
                    </div>
                `;
                list.appendChild(div);
            });
        } else {
            list.innerHTML = '<div style="color: #888; font-size: 0.9rem;">No comments yet.</div>';
        }
    } catch (e) {
        list.innerHTML = 'Error loading comments.';
    }
}

window.submitComment = function(postId) {
    requireAuth(async () => {
        const input = document.getElementById(`comment-input-${postId}`);
        const content = input.value.trim();
        if (!content) return;
        
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`/api/community/posts/${postId}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content, is_anonymous: false })
            });
            if (res.ok) {
                input.value = '';
                loadComments(postId);
                // Also update the UI manually or re-fetch posts
                fetchPosts();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to comment');
            }
        } catch (e) {
            console.error(e);
        }
    });
};

window.acceptAnswer = async function(postId, commentId) {
    if (!confirm("Are you sure you want to accept this answer? This will award the author 50 points and cannot be undone.")) return;
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/community/posts/${postId}/accept/${commentId}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            alert('Answer accepted! 50 points awarded.');
            fetchPosts();
        } else {
            const data = await res.json();
            alert(data.error);
        }
    } catch (e) {
        console.error(e);
    }
};

// Handle New Post Submission
document.getElementById('btn-submit-post').addEventListener('click', async () => {
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const tagsStr = document.getElementById('post-tags').value.trim();
    const isAnonymous = document.getElementById('post-anonymous').checked;
    
    if (!title || !content) {
        alert("Title and content are required.");
        return;
    }
    
    let tags = [];
    if (tagsStr) {
        tags = tagsStr.split(',').map(t => t.trim()).filter(t => t.length > 0);
    }
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/community/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, content, tags: JSON.stringify(tags), is_anonymous: isAnonymous })
        });
        
        if (res.ok) {
            document.getElementById('post-title').value = '';
            document.getElementById('post-content').value = '';
            document.getElementById('post-tags').value = '';
            document.getElementById('post-anonymous').checked = false;
            fetchPosts();
        } else {
            const data = await res.json();
            alert(data.error);
        }
    } catch (e) {
        console.error(e);
    }
});

// Sort Buttons
document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentSort = e.currentTarget.dataset.sort;
        fetchPosts();
    });
});

// Sidebar create post focus
document.getElementById('btn-create-post-sidebar').addEventListener('click', () => {
    requireAuth(() => {
        document.getElementById('post-title').focus();
    });
});

// Init
(async function init() {
    await checkAuth();
    if (!currentUser) {
        window.location.href = '/';
        return;
    }
    updateNav();
    fetchPosts();
})();

// --- Admin Panel Logic ---

async function loadAdminCommunityStats() {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/community/admin/stats', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        
        if (data.stats) {
            document.getElementById('admin-comm-total-posts').textContent = data.stats.total_posts || 0;
            document.getElementById('admin-comm-total-comments').textContent = data.stats.total_comments || 0;
        }
        
        const list = document.getElementById('admin-comm-moderation-list');
        list.innerHTML = '';
        
        if (data.moderationFeed && data.moderationFeed.length > 0) {
            data.moderationFeed.forEach(item => {
                const tr = document.createElement('tr');
                tr.style.borderBottom = "1px solid rgba(255,255,255,0.05)";
                tr.innerHTML = `
                    <td style="padding: 0.5rem 0;">
                        <div style="color: #66fcf1; font-weight: 600;">${item.type.toUpperCase()} by #${item.user_id}</div>
                        <div style="color: #ccc; margin-top: 0.25rem;">${item.snippet.length > 40 ? item.snippet.substring(0, 40) + '...' : item.snippet}</div>
                        <div style="color: #888; font-size: 0.7rem; margin-top: 0.25rem;">${new Date(item.created_at).toLocaleDateString()}</div>
                    </td>
                    <td style="padding: 0.5rem 0; text-align: right;">
                        <button class='btn btn-sm' style='background: rgba(255, 75, 75, 0.1); color: #ff4b4b; padding: 2px 8px; font-size: 0.7rem;' onclick='deleteCommunityItem("${item.type}", "${item.id}", this)'><i class="fa-solid fa-trash"></i></button>
                    </td>
                `;
                list.appendChild(tr);
            });
        } else {
            list.innerHTML = '<tr><td colspan="2" style="text-align: center; padding: 1rem; color: #888;">No community activity yet.</td></tr>';
        }
    } catch (e) {
        console.error(e);
        document.getElementById('admin-comm-moderation-list').innerHTML = '<tr><td colspan="2" style="text-align: center; color: #ff4b4b;">Failed to load moderation feed</td></tr>';
    }
}

window.deleteCommunityItem = async function(type, id, btn) {
    if (!confirm('Are you sure you want to delete this ' + type + '? This action cannot be undone.')) return;
    
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btn.disabled = true;
    
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/community/' + type + 's/' + id, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            btn.closest('tr').remove();
            fetchPosts(); // Refresh feed just in case
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete');
            btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            btn.disabled = false;
        }
    } catch (e) {
        alert('Error deleting item');
        btn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        btn.disabled = false;
    }
};
