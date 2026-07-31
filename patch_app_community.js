const fs = require('fs');
let content = fs.readFileSync('public/app.js', 'utf8');

const communityJS = `
// ==========================================
// COMMUNITY HUB
// ==========================================

async function loadCommunityPosts() {
    const container = document.getElementById('community-feed');
    if (!container) return;
    
    try {
        container.innerHTML = '<div style="text-align:center; padding: 2rem;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';
        
        const response = await fetch(\`\${API_BASE}/community/posts\`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error);
        
        if (!data.posts || data.posts.length === 0) {
            container.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.4); padding: 2rem;">No posts yet. Be the first to start a discussion!</div>';
            return;
        }
        
        container.innerHTML = data.posts.map(post => \`
            <div class="card glassmorphic" style="padding: 1.25rem; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="margin: 0 0 0.5rem 0; color: #dfb15b; font-size: 1.1rem;">\${escapeHTML(post.title)}</h4>
                        <div style="font-size: 0.8rem; color: rgba(255,255,255,0.5); margin-bottom: 1rem;">
                            By <strong style="color: #fff;">\${escapeHTML(post.name)}</strong> (\${escapeHTML(post.programme)}) • \${new Date(post.created_at).toLocaleDateString()}
                        </div>
                    </div>
                    <button onclick="upvotePost(\${post.post_id})" style="background: none; border: 1px solid \${post.user_has_upvoted ? '#dfb15b' : 'rgba(255,255,255,0.2)'}; color: \${post.user_has_upvoted ? '#dfb15b' : '#fff'}; border-radius: 4px; padding: 0.3rem 0.6rem; cursor: pointer; transition: 0.2s;">
                        <i class="fa-solid fa-arrow-up"></i> \${post.upvotes}
                    </button>
                </div>
                <div style="color: rgba(255,255,255,0.85); line-height: 1.6; font-size: 0.95rem; margin-bottom: 1rem;">
                    \${escapeHTML(post.content).replace(/\\n/g, '<br>')}
                </div>
                <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 0.75rem;">
                    <button onclick="toggleComments(\${post.post_id})" style="background: none; border: none; color: rgba(255,255,255,0.6); cursor: pointer; font-family: inherit;">
                        <i class="fa-regular fa-comment"></i> \${post.comment_count} Comments
                    </button>
                    <div id="comments-section-\${post.post_id}" style="display: none; margin-top: 1rem; border-left: 2px solid rgba(223,177,91,0.3); padding-left: 1rem;">
                        <div id="comments-list-\${post.post_id}"></div>
                        <div style="display: flex; gap: 0.5rem; margin-top: 1rem;">
                            <input type="text" id="comment-input-\${post.post_id}" class="input-field" placeholder="Add a comment..." style="flex: 1; padding: 0.5rem;">
                            <button onclick="submitComment(\${post.post_id})" class="btn btn-primary" style="padding: 0.5rem 1rem;">Reply</button>
                        </div>
                    </div>
                </div>
            </div>
        \`).join('');
        
    } catch (err) {
        container.innerHTML = \`<div style="color: #ef4444; padding: 1rem;">Failed to load posts: \${err.message}</div>\`;
    }
}

async function upvotePost(postId) {
    try {
        const response = await fetch(\`\${API_BASE}/community/posts/\${postId}/upvote\`, { method: 'POST' });
        if (!response.ok) throw new Error('Failed to upvote');
        loadCommunityPosts(); // Reload to update counts
    } catch (err) {
        showToast('Error', err.message, 'error');
    }
}

async function toggleComments(postId) {
    const section = document.getElementById(\`comments-section-\${postId}\`);
    if (section.style.display === 'none') {
        section.style.display = 'block';
        loadComments(postId);
    } else {
        section.style.display = 'none';
    }
}

async function loadComments(postId) {
    const container = document.getElementById(\`comments-list-\${postId}\`);
    try {
        container.innerHTML = 'Loading comments...';
        const response = await fetch(\`\${API_BASE}/community/posts/\${postId}/comments\`);
        const data = await response.json();
        
        if (!data.comments || data.comments.length === 0) {
            container.innerHTML = '<span style="color:rgba(255,255,255,0.4); font-size: 0.85rem;">No comments yet.</span>';
            return;
        }
        
        container.innerHTML = data.comments.map(c => \`
            <div style="margin-bottom: 0.75rem; background: rgba(0,0,0,0.1); padding: 0.75rem; border-radius: 6px;">
                <div style="display: flex; justify-content: space-between;">
                    <strong style="color: #dfb15b; font-size: 0.85rem;">\${escapeHTML(c.name)}</strong>
                    <span style="font-size: 0.75rem; color: rgba(255,255,255,0.4);">\${new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <div style="font-size: 0.9rem; margin-top: 0.25rem;">\${escapeHTML(c.content)}</div>
            </div>
        \`).join('');
    } catch (err) {
        container.innerHTML = 'Failed to load comments.';
    }
}

async function submitComment(postId) {
    const input = document.getElementById(\`comment-input-\${postId}\`);
    const content = input.value.trim();
    if (!content) return;
    
    try {
        const response = await fetch(\`\${API_BASE}/community/posts/\${postId}/comments\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        
        if (!response.ok) throw new Error('Failed to comment');
        
        input.value = '';
        loadComments(postId);
        loadCommunityPosts(); // To update the comment count
        showToast('Success', 'Comment added! +5 points', 'success');
        fetchOverview(); // Update points balance in UI
    } catch (err) {
        showToast('Error', err.message, 'error');
    }
}

// Attach event listeners for Community UI
document.addEventListener('DOMContentLoaded', () => {
    const btnNewPost = document.getElementById('btn-new-post');
    const newPostContainer = document.getElementById('new-post-container');
    const btnCancelPost = document.getElementById('btn-cancel-post');
    const btnSubmitPost = document.getElementById('btn-submit-post');
    
    if (btnNewPost) {
        btnNewPost.addEventListener('click', () => {
            newPostContainer.style.display = 'block';
            btnNewPost.style.display = 'none';
        });
    }
    
    if (btnCancelPost) {
        btnCancelPost.addEventListener('click', () => {
            newPostContainer.style.display = 'none';
            btnNewPost.style.display = 'block';
            document.getElementById('post-title').value = '';
            document.getElementById('post-content').value = '';
        });
    }
    
    if (btnSubmitPost) {
        btnSubmitPost.addEventListener('click', async () => {
            const title = document.getElementById('post-title').value.trim();
            const content = document.getElementById('post-content').value.trim();
            
            if (!title || !content) {
                showToast('Error', 'Title and content are required', 'error');
                return;
            }
            
            try {
                btnSubmitPost.disabled = true;
                btnSubmitPost.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...';
                
                const response = await fetch(\`\${API_BASE}/community/posts\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title, content })
                });
                
                const data = await response.json();
                if (!response.ok) throw new Error(data.error);
                
                showToast('Success', data.message, 'success');
                btnCancelPost.click();
                loadCommunityPosts();
                fetchOverview(); // Update points balance
            } catch (err) {
                showToast('Error', err.message, 'error');
            } finally {
                btnSubmitPost.disabled = false;
                btnSubmitPost.innerHTML = 'Publish Post (+10 pts)';
            }
        });
    }
    
    // Add interceptor to load community posts when tab is clicked
    const communityTabBtn = document.querySelector('button[data-target="community-hub"]');
    if (communityTabBtn) {
        communityTabBtn.addEventListener('click', () => {
            loadCommunityPosts();
        });
    }
});
`;

if (!content.includes('loadCommunityPosts')) {
    content += "\n" + communityJS;
    fs.writeFileSync('public/app.js', content);
    console.log("Patched app.js with Community logic.");
} else {
    console.log("Already patched.");
}
