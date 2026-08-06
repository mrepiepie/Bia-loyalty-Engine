const fs = require('fs');

let js = fs.readFileSync('public/community.js', 'utf8');

// 1. Make sure current user's role is stored or accessible to show the delete button
// Usually, we can check if there's a token and fetch the user profile, but since the post rendering might not know the user's role synchronously,
// we will just add the button and if they are not an admin, the backend will reject it.
// Actually, it's better to add the Delete button next to Report.

if (!js.includes('deletePost(')) {
    // Inject the delete button HTML in the post template
    js = js.replace(
        '<button onclick="openReportModal(',
        '<button onclick="deletePost(${post.post_id})" class="btn btn-sm admin-only-btn" style="background: none; border: none; color: #ef4444; cursor: pointer; padding: 0.3rem 0.5rem; font-size: 0.75rem;"><i class="fa-solid fa-trash"></i> Delete</button>\n                <button onclick="openReportModal('
    );
    
    // Inject the JS function
    js += `
// Delete Post (Admin Only)
window.deletePost = async function(postId) {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) return;
    
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(\`/api/community/posts/\${postId}\`, {
            method: 'DELETE',
            headers: { 'Authorization': \`Bearer \${token}\` }
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
`;
    fs.writeFileSync('public/community.js', js);
}
