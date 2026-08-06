// community.js

let currentUser = null;
let currentSort = 'hot';
let currentCategory = 'Home';

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
            const data = await res.json();
            currentUser = data.user;
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

async function fetchPosts(isSilent = false) {
    const feed = document.getElementById('feed-container');
    if (!isSilent) {
        feed.innerHTML = '<div style="text-align: center; padding: 3rem; color: #888;"><i class="fa-solid fa-circle-notch fa-spin fa-2x"></i></div>';
    } else {
        feed.style.opacity = '0.5';
        feed.style.pointerEvents = 'none';
    }
    
    const headers = {};
    const token = localStorage.getItem('token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    try {
        const res = await fetch(`/api/community/posts?sort=${currentSort}&_t=${Date.now()}`, { headers });
        const data = await res.json();
        
        feed.innerHTML = '';
        if (data.posts && data.posts.length > 0) {
            let filteredPosts = data.posts;
            if (currentCategory !== 'Home') {
                filteredPosts = data.posts.filter(p => {
                    try {
                        const t = JSON.parse(p.tags || '[]');
                        return t.includes(currentCategory);
                    } catch(e) { return false; }
                });
            }
            
            if (filteredPosts.length > 0) {
                filteredPosts.forEach(post => {
                    feed.appendChild(createPostElement(post));
                });
            } else {
                feed.innerHTML = '<div style="text-align: center; padding: 3rem; color: #888;">No posts found in this category. Be the first to start a discussion!</div>';
            }
        } else {
            feed.innerHTML = '<div style="text-align:center; color:#888; padding: 2rem;">No posts found. Be the first to start a discussion!</div>';
        }
        feed.style.opacity = '1';
        feed.style.pointerEvents = 'auto';
    } catch (err) {
        feed.innerHTML = `<div style="color:#ff4b4b; text-align:center;">Failed to load posts: ${err.message}</div>`;
        feed.style.opacity = '1';
        feed.style.pointerEvents = 'auto';
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

    let commentsHtml = `
            <div class="comments-section" id="comments-${post.post_id}" style="display: none; margin-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 1rem;">
                <!-- Comments injected here -->
            </div>
        `;
        
    const imageHtml = post.image_url ? `<img src="${post.image_url}" style="max-width: 100%; max-height: 400px; border-radius: 8px; margin-top: 1rem; margin-bottom: 0.5rem; display: block; object-fit: cover;" alt="Post Attachment">` : '';

    div.innerHTML = `
        <div class="post-votes">
            <button class="btn-vote ${post.user_has_upvoted ? 'active' : ''}" onclick="handleVote('post', ${post.post_id}, 1, this)"><i class="fa-solid fa-arrow-up"></i></button>
            <span class="vote-count">${post.upvotes - post.downvotes}</span>
            <button class="btn-vote ${post.user_has_downvoted ? 'active' : ''}" onclick="handleVote('post', ${post.post_id}, -1, this)"><i class="fa-solid fa-arrow-down"></i></button>
        </div>
        <div class="post-content-area">
            ${acceptedHtml}
            <div class="post-meta">
                <span style="color: #fff; font-weight: 600;">${post.name}</span>
                ${post.programme ? `<span style="background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem;">${post.programme}</span>` : ''}
                <span>•</span>
                <span>${new Date(post.created_at).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                ${tagsHtml ? `<span>•</span> ${tagsHtml}` : ''}
            </div>
            <h3 class="post-title" id="post-title-text-${post.post_id}">${post.title}</h3>
            <div class="post-body" id="post-body-text-${post.post_id}">${post.content}</div>
            ${imageHtml}
            <div class="post-actions" style="display: flex; justify-content: space-between; align-items: center; width: 100%;"><div style="display: flex; align-items: center; gap: 1rem;">
                <button class="action-btn" onclick="toggleComments(${post.post_id})">
                    <i class="fa-regular fa-message"></i> ${post.comment_count} Comments
                </button>
                ${currentUser && currentUser.user_id === post.user_id && !post.accepted_answer_id ? 
                    `<span style="color: #dfb15b; font-size: 0.85rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-crown"></i> Accept an answer to help others!
                    </span>` : ''}
                
                ${currentUser && currentUser.role === 'admin' ? `
                    <button class="action-btn" style="color:#dfb15b;" onclick="adminEditPost(${post.post_id})">
                        <i class="fa-solid fa-pen"></i> Edit
                    </button>
                    <button class="action-btn" style="color:${post.is_locked ? '#ff4b4b' : '#66fcf1'};" onclick="adminLockPost(${post.post_id}, ${!post.is_locked})">
                        <i class="fa-solid ${post.is_locked ? 'fa-lock' : 'fa-unlock'}"></i> ${post.is_locked ? 'Unlock' : 'Lock'}
                    </button>
                    <button class="action-btn" style="color:#ff4b4b;" onclick="adminDeleteCommunityContent('post', ${post.post_id})">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                ` : ''}
                </div>
                <button onclick="openReportModal('post', ${post.post_id}, ${post.user_id})" class="btn btn-sm" style="background: none; border: none; color: rgba(239, 68, 68, 0.6); cursor: pointer; padding: 0.3rem 0.5rem; font-size: 0.75rem;">
                    <i class="fa-solid fa-flag"></i> Report
                </button>
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

window.handleVote = function(type, id, value, btnElement) {
    requireAuth(async () => {
        const token = localStorage.getItem('token');
        
        // Optimistic UI Update
        if (btnElement) {
            const container = btnElement.parentElement;
            const scoreSpan = container.querySelector('.vote-count') || container.querySelector('span');
            const upBtn = container.querySelectorAll('button')[0];
            const downBtn = container.querySelectorAll('button')[1];
            
            if (scoreSpan && upBtn && downBtn) {
                let oldScore = parseInt(scoreSpan.textContent) || 0;
                let diff = 0;
                
                if (value === 1) {
                    if (upBtn.classList.contains('active')) {
                        diff = -1;
                        upBtn.classList.remove('active');
                    } else {
                        diff = downBtn.classList.contains('active') ? 2 : 1;
                        upBtn.classList.add('active');
                        downBtn.classList.remove('active');
                    }
                } else if (value === -1) {
                    if (downBtn.classList.contains('active')) {
                        diff = 1;
                        downBtn.classList.remove('active');
                    } else {
                        diff = upBtn.classList.contains('active') ? -2 : -1;
                        downBtn.classList.add('active');
                        upBtn.classList.remove('active');
                    }
                }
                
                let newScore = oldScore + diff;
                scoreSpan.textContent = newScore;
                
                if (type === 'comment') {
                    scoreSpan.style.color = newScore > 0 ? '#66fcf1' : (newScore < 0 ? '#ff4b4b' : '#fff');
                }
            }
        }
        
        try {
            await fetch(`/api/community/${type}s/${id}/vote`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ value })
            });
            // We removed fetchPosts() here so the UI doesn't refresh disruptively!
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

                const adminDeleteBtn = currentUser && currentUser.role === 'admin' ? 
                    `<button class="btn btn-sm" style="background: rgba(255, 75, 75, 0.2); color: #ff4b4b; border: 1px solid #ff4b4b; padding: 2px 8px; font-size: 0.7rem; margin-left: 0.5rem;" onclick="adminDeleteCommunityContent('comment', ${c.comment_id})"><i class="fa-solid fa-trash"></i> Delete</button>` : '';

                div.innerHTML = `
                    <div style="font-size: 0.8rem; color: #888; margin-bottom: 0.25rem;">
                        <strong style="color: #fff;">${c.name}</strong> • ${new Date(c.created_at).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        ${acceptBtn}
                        ${adminDeleteBtn}
                    </div>
                    <div style="font-size: 0.95rem; margin-bottom: 0.5rem;">${c.content}</div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        <button class="vote-btn ${upvoted}" style="font-size: 0.9rem;" onclick="handleVote('comment', ${c.comment_id}, 1, this)"><i class="fa-solid fa-arrow-up"></i></button>
                        <span style="font-size: 0.9rem; font-weight: bold; color: ${score > 0 ? '#66fcf1' : (score < 0 ? '#ff4b4b' : '#fff')}">${score}</span>
                        <button class="vote-btn ${downvoted}" style="font-size: 0.9rem;" onclick="handleVote('comment', ${c.comment_id}, -1, this)"><i class="fa-solid fa-arrow-down"></i></button>
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
                // Silently update post feed so we don't blink the whole page
                fetchPosts(true);
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
            fetchPosts(true);
        } else {
            const data = await res.json();
            alert(data.error);
        }
    } catch (e) {
        console.error(e);
    }
};

// Handle New Post Submission
// Image label update
document.getElementById('post-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('post-image-label').textContent = file.name.substring(0, 15) + '...';
    } else {
        document.getElementById('post-image-label').textContent = 'Attach Image';
    }
});

document.getElementById('btn-submit-post').addEventListener('click', async () => {
    const title = document.getElementById('post-title').value.trim();
    const content = document.getElementById('post-content').value.trim();
    const category = document.getElementById('post-category').value;
    const isAnonymous = document.getElementById('post-anonymous').checked;
    const imageFile = document.getElementById('post-image').files[0];
    
    if (!title || !content) {
        alert("Title and content are required.");
        return;
    }
    
    let image_base64 = null;
    if (imageFile) {
        const reader = new FileReader();
        image_base64 = await new Promise((resolve) => {
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(imageFile);
        });
    }
    
    let tags = [category];
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/community/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, content, tags: JSON.stringify(tags), is_anonymous: isAnonymous, image_base64 })
        });
        
        if (res.ok) {
            document.getElementById('post-title').value = '';
            document.getElementById('post-content').value = '';
            document.getElementById('post-category').value = 'General';
            document.getElementById('post-anonymous').checked = false;
            document.getElementById('post-image').value = '';
            document.getElementById('post-image-label').textContent = 'Attach Image';
            fetchPosts(true);
        } else {
            const data = await res.json();
            alert(data.error);
        }
    } catch (e) {
        console.error(e);
        alert("Failed to submit post. If you attached an image, it might be too large.");
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

window.adminLockPost = async function(postId, lock) {
    if (!confirm(`Are you sure you want to ${lock ? 'lock' : 'unlock'} this post?`)) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/community/posts/${postId}/lock`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ locked: lock })
        });
        if (!res.ok) throw new Error(await res.text());
        alert(`Post has been ${lock ? 'locked' : 'unlocked'}.`);
        fetchPosts(true);
    } catch (e) {
        alert('Error: ' + e.message);
    }
};

window.adminDeleteCommunityContent = async function(type, id) {
    if (!confirm(`Are you sure you want to delete this ${type}? This cannot be undone.`)) return;
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/community/${type}s/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(await res.text());
        fetchPosts(true);
    } catch (e) {
        alert('Error: ' + e.message);
    }
};

window.adminEditPost = async function(postId) {
    const titleEl = document.getElementById(`post-title-text-${postId}`);
    const bodyEl = document.getElementById(`post-body-text-${postId}`);
    
    if (!titleEl || !bodyEl) return;
    
    const newTitle = prompt("Edit Title:", titleEl.innerText);
    if (newTitle === null) return;
    
    const newContent = prompt("Edit Content:", bodyEl.innerText);
    if (newContent === null) return;
    
    if (!newTitle.trim() || !newContent.trim()) {
        alert("Title and content cannot be empty.");
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/admin/community/posts/${postId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ title: newTitle.trim(), content: newContent.trim() })
        });
        if (!res.ok) throw new Error(await res.text());
        alert('Post updated successfully.');
        fetchPosts(true);
    } catch (e) {
        alert('Error: ' + e.message);
    }
};

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
                        <div style="color: #888; font-size: 0.7rem; margin-top: 0.25rem;">${new Date(item.created_at).toLocaleString([], { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
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

// Handle Discover Tabs
document.querySelectorAll('.category-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.getAttribute('data-category');
        fetchPosts();
    });
});

// Delete Post (Admin Only)
window.deletePost = async function(postId) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;
    
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/community/posts/${postId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            alert('Post deleted successfully.');
            loadFeed(); // Refresh the feed
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete post. You might not have Admin permissions.');
        }
    } catch (e) {
        console.error(e);
        alert('An error occurred.');
    }
};


// Reporting Logic
window.openReportModal = function(targetType, targetId, targetUserId) {
    document.getElementById('report-target-type').value = targetType;
    document.getElementById('report-target-id').value = targetId;
    document.getElementById('report-target-user').value = targetUserId || '';
    document.getElementById('report-reason').value = '';
    document.getElementById('report-modal').style.display = 'flex';
};

window.submitReport = async function() {
        const targetType = document.getElementById('report-target-type').value;
        const targetId = document.getElementById('report-target-id').value;
        const targetUser = document.getElementById('report-target-user').value;
        const category = document.getElementById('report-category').value;
        const reason = document.getElementById('report-reason').value.trim();
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/community/reports', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    post_id: targetType === 'post' ? targetId : null,
                    comment_id: targetType === 'comment' ? targetId : null,
                    reported_user_id: targetUser || null,
                    category,
                    reason
                })
            });
            
            if (res.ok) {
                document.getElementById('report-modal').style.display = 'none';
                alert('Report submitted successfully. Our team will review it.');
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to submit report.');
            }
        } catch (e) {
            console.error(e);
            alert('An error occurred while submitting the report.');
        }
};
