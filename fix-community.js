const fs = require('fs');
let code = fs.readFileSync('public/community.js', 'utf8');

code = code.replace(
    /<div class="post-actions">/,
    '<div class="post-actions" style="display: flex; justify-content: space-between; align-items: center; width: 100%;"><div style="display: flex; align-items: center; gap: 1rem;">'
);

code = code.replace(
    /(\$\{currentUser && currentUser\.role === 'admin'[\s\S]*?<\/button>\s*` : ''\})/,
    `$1
                </div>
                <button onclick="openReportModal('post', \${post.post_id}, \${post.user_id})" class="btn btn-sm" style="background: none; border: none; color: rgba(239, 68, 68, 0.6); cursor: pointer; padding: 0.3rem 0.5rem; font-size: 0.75rem;">
                    <i class="fa-solid fa-flag"></i> Report
                </button>`
);

fs.writeFileSync('public/community.js', code);
