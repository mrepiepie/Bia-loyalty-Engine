const fs = require('fs');
let js = fs.readFileSync('public/community.js', 'utf8');

// 1. Add variables at top if not present
if (!js.includes('let latestPostId = 0;')) {
    js = js.replace("let currentCategory = 'Home';", "let currentCategory = 'Home';\nlet latestPostId = 0;\nlet pendingNewPosts = [];\nlet pollingInterval = null;");
}

// 2. Modify fetchPosts url building
js = js.replace(
    "const res = await fetch(`/api/community/posts?sort=${currentSort}&_t=${Date.now()}`, { headers });",
    "let url = `/api/community/posts?sort=${currentSort}&_t=${Date.now()}`;\n        if (currentCategory === 'Mine') url += '&filter=mine';\n        const res = await fetch(url, { headers });"
);

// 3. Modify fetchPosts to track maxId and handle 'Mine' category filtering
js = js.replace(
    "if (currentCategory !== 'Home') {",
    "const maxId = Math.max(...data.posts.map(p => p.post_id));\n            if (maxId > latestPostId) latestPostId = maxId;\n\n            if (currentCategory !== 'Home' && currentCategory !== 'Mine') {"
);

// 4. Start polling at the end of fetchPosts
js = js.replace(
    "feed.style.opacity = '1';\n        feed.style.pointerEvents = 'auto';",
    "feed.style.opacity = '1';\n        feed.style.pointerEvents = 'auto';\n        startPolling();"
);

// 5. Check if My Posts Tab logic is in the sidebar click listener
// In community.js, the categories are handled by tabs
// We need to make sure the 'Mine' tab triggers fetchPosts.
// Actually, they use data-category="Mine". 
// The logic is:
/*
    document.querySelectorAll('.category-tab').forEach(btn => {
        btn.addEventListener('click', () => { ... currentCategory = btn.dataset.category; fetchPosts(); ... });
    });
*/
// We don't need to change the click listener! It just grabs data-category. But we need to ensure "Mine" tab handles active states.
// Oh wait, for 'Mine', we just need to ensure `currentUser` check. If not logged in, they shouldn't see it.
// In checkAuth() / updateNav():
js = js.replace(
    "document.getElementById('create-post-box').style.display = 'block';",
    "document.getElementById('create-post-box').style.display = 'block';\n        const myPostsTab = document.getElementById('my-posts-tab');\n        if (myPostsTab) myPostsTab.style.display = 'block';"
);

js = js.replace(
    "document.getElementById('create-post-box').style.display = 'none';",
    "document.getElementById('create-post-box').style.display = 'none';\n        const myPostsTab = document.getElementById('my-posts-tab');\n        if (myPostsTab) myPostsTab.style.display = 'none';"
);

// 6. Append polling functions
if (!js.includes('function startPolling')) {
    js += `

// --- POLLING LOGIC ---
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pendingNewPosts = []; // Reset on new view
    const bubble = document.getElementById('new-posts-bubble');
    if (bubble) bubble.style.display = 'none';

    pollingInterval = setInterval(async () => {
        if (!latestPostId) return;
        const headers = {};
        const token = localStorage.getItem('token');
        if (token) headers['Authorization'] = \`Bearer \${token}\`;
        
        let url = \`/api/community/posts?sort=\${currentSort}&since_id=\${latestPostId}\`;
        if (currentCategory === 'Mine') url += '&filter=mine';
        
        try {
            const res = await fetch(url, { headers });
            if (!res.ok) return;
            const data = await res.json();
            
            if (data.posts && data.posts.length > 0) {
                let newPosts = data.posts;
                if (currentCategory !== 'Home' && currentCategory !== 'Mine') {
                    newPosts = data.posts.filter(p => {
                        try {
                            const t = JSON.parse(p.tags || '[]');
                            return t.includes(currentCategory);
                        } catch(e) { return false; }
                    });
                }
                
                if (newPosts.length > 0) {
                    pendingNewPosts = [...newPosts, ...pendingNewPosts];
                    // Remove duplicates just in case
                    const uniqueIds = new Set();
                    pendingNewPosts = pendingNewPosts.filter(p => {
                        if (uniqueIds.has(p.post_id)) return false;
                        uniqueIds.add(p.post_id);
                        return true;
                    });
                    
                    const maxId = Math.max(...pendingNewPosts.map(p => p.post_id));
                    if (maxId > latestPostId) latestPostId = maxId;
                    
                    if (bubble) {
                        const countSpan = document.getElementById('new-posts-count');
                        if (countSpan) countSpan.innerText = pendingNewPosts.length;
                        bubble.style.display = 'block';
                    }
                }
            }
        } catch (e) {
            console.error('Polling error', e);
        }
    }, 15000);
}

window.loadNewPosts = function() {
    const feed = document.getElementById('feed-container');
    const bubble = document.getElementById('new-posts-bubble');
    
    // Sort ascending so when we prepend, the highest ID ends up on top
    pendingNewPosts.sort((a,b) => a.post_id - b.post_id);
    
    pendingNewPosts.forEach(post => {
        const el = createPostElement(post);
        // Prepend animation class
        el.style.animation = 'popIn 0.4s ease';
        if (feed.firstChild) {
            feed.insertBefore(el, feed.firstChild);
        } else {
            feed.appendChild(el);
        }
    });
    
    pendingNewPosts = [];
    if (bubble) bubble.style.display = 'none';
};
`;
}

fs.writeFileSync('public/community.js', js);
console.log('Injected polling and filtering logic.');
