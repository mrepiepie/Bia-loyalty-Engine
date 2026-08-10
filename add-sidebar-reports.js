const fs = require('fs');

let js = fs.readFileSync('public/community.js', 'utf8');

if (!js.includes('loadSidebarReports')) {
    js += `

// ----------------------------------------------------
// Sidebar Reports (Admin)
// ----------------------------------------------------
window.loadSidebarReports = async function() {
    const container = document.getElementById('sidebar-reports-container');
    if (!container) return;
    
    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/reports', {
            headers: { 'Authorization': \`Bearer \${token}\` }
        });
        
        if (!res.ok) throw new Error('Failed to load reports');
        const data = await res.json();
        
        if (data.length === 0) {
            container.innerHTML = '<div style="color: rgba(255,255,255,0.5); font-size: 0.8rem; text-align: center;">No pending reports.</div>';
            return;
        }
        
        container.innerHTML = data.map(userStats => \`
            <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); padding: 0.8rem; border-radius: 6px; margin-bottom: 0.8rem;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div>
                        <div style="color: #fff; font-size: 0.85rem; font-weight: 600;">\${userStats.reported_user_name}</div>
                        <span style="font-size: 0.7rem; color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 2px 6px; border-radius: 12px;">\${userStats.total_reports} Reports</span>
                    </div>
                    <button onclick="toggleMuteUser(\${userStats.reported_user_id}, \${userStats.is_muted})" class="btn btn-sm" style="background: \${userStats.is_muted ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: \${userStats.is_muted ? '#4ade80' : '#ef4444'}; border: 1px solid \${userStats.is_muted ? '#4ade80' : '#ef4444'}; font-size: 0.7rem; padding: 2px 6px;">
                        <i class="fa-solid \${userStats.is_muted ? 'fa-microphone' : 'fa-microphone-lines-slash'}"></i> \${userStats.is_muted ? 'Unmute' : 'Mute'}
                    </button>
                </div>
                
                <div style="font-size: 0.75rem; color: rgba(255,255,255,0.6); max-height: 100px; overflow-y: auto;">
                    \${userStats.reports.map(r => \`
                        <div style="margin-bottom: 0.4rem; padding-bottom: 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.05);">
                            <strong style="color: #dfb15b;">[\${r.category}]</strong>: \${r.reason || 'N/A'}<br>
                            <span style="font-size: 0.65rem; color: rgba(255,255,255,0.4);">By \${r.reporter_name} - \${new Date(r.created_at).toLocaleString([], {month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
                        </div>
                    \`).join('')}
                </div>
            </div>
        \`).join('');
    } catch (err) {
        console.error(err);
        container.innerHTML = \`<div style="color: #ef4444; font-size: 0.8rem; text-align: center;">\${err.message}</div>\`;
    }
};

window.toggleMuteUser = async function(userId, isCurrentlyMuted) {
    let durationHours = null;
    if (!isCurrentlyMuted) {
        const input = prompt("How many hours should this user be muted for? (e.g., 24 for one day, 168 for one week)", "24");
        if (input === null) return; // User cancelled
        durationHours = parseInt(input);
        if (isNaN(durationHours) || durationHours <= 0) {
            alert("Invalid duration. Please enter a valid number of hours.");
            return;
        }
    } else {
        if (!confirm("Are you sure you want to unmute this user early?")) return;
    }

    try {
        const res = await fetch(\`/api/admin/users/\${userId}/mute\`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': \`Bearer \${localStorage.getItem('token')}\`
            },
            body: JSON.stringify({ 
                is_muted: !isCurrentlyMuted,
                duration_hours: durationHours
            })
        });
        
        if (res.ok) {
            alert(\`User successfully \${!isCurrentlyMuted ? 'muted for ' + durationHours + ' hours' : 'unmuted'}\`);
            if (typeof loadSidebarReports === 'function') loadSidebarReports();
        } else {
            const data = await res.json();
            alert(data.error || 'Failed to toggle mute status');
        }
    } catch (e) {
        console.error(e);
        alert('An error occurred');
    }
};
`;
    
    // Also inject the call to loadSidebarReports into checkAuth
    js = js.replace(
        "loadAdminCommunityStats();",
        "loadAdminCommunityStats();\n            document.getElementById('admin-reports-sidebar').style.display = 'block';\n            loadSidebarReports();"
    );

    fs.writeFileSync('public/community.js', js);
}
