const fs = require('fs');
let js = fs.readFileSync('public/app.js', 'utf8');

// 1. Add opacity styling to the card based on has_pending
js = js.replace(
    '<div class="card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">',
    '<div class="card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; ${!userStats.has_pending ? \'opacity: 0.6;\' : \'\'}">'
);

// 2. Add the "Reviewed/Resolved" button to the button group
const oldBtnGrp = `<button onclick="toggleMuteUser(\${userStats.reported_user_id}, \${userStats.is_muted})" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; color: \${userStats.is_muted ? '#4ade80' : '#ef4444'}; border-color: \${userStats.is_muted ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)'};">
                            <i class="fa-solid \${userStats.is_muted ? 'fa-microphone' : 'fa-microphone-lines-slash'}"></i> \${userStats.is_muted ? 'Unmute' : 'Mute'}
                        </button>`;
const newBtnGrp = oldBtnGrp + `\n                        \${userStats.has_pending ? \`<button onclick="resolveUserReports(\${userStats.reported_user_id})" class="btn btn-secondary btn-sm" style="font-size: 0.75rem; color: #3b82f6; border-color: rgba(59, 130, 246, 0.3);"><i class="fa-solid fa-check"></i> Reviewed</button>\` : \`<span style="font-size: 0.75rem; color: #4ade80; padding: 0.2rem 0.5rem; border: 1px solid rgba(74, 222, 128, 0.2); border-radius: 4px; background: rgba(74, 222, 128, 0.05); display: flex; align-items: center; gap: 4px;"><i class="fa-solid fa-check-double"></i> Resolved</span>\`}`;
js = js.replace(oldBtnGrp, newBtnGrp);

// 3. Append the resolveUserReports function
if (!js.includes('function resolveUserReports')) {
    const fn = `
async function resolveUserReports(userId) {
    if (!confirm('Mark all reports for this user as resolved?')) return;
    try {
        const res = await fetch(\`/api/admin/users/\${userId}/resolve-reports\`, {
            method: 'POST',
            headers: {
                'Authorization': \`Bearer \${localStorage.getItem('token')}\`
            }
        });
        if (res.ok) {
            showToast('Success', 'Reports resolved', 'success');
            loadAdminReports(); // Refresh the list so it sinks to the bottom
        } else {
            const data = await res.json();
            showToast('Error', data.error || 'Failed to resolve reports', 'error');
        }
    } catch (e) {
        showToast('Error', 'Network error', 'error');
    }
}
`;
    js += fn;
}

fs.writeFileSync('public/app.js', js);
console.log('Successfully injected resolve logic.');
