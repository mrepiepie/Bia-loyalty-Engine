const fs = require('fs');

// 1. Add modal HTML to community.html
let html = fs.readFileSync('public/community.html', 'utf8');
if (!html.includes('id="report-modal"')) {
    html = html.replace('</body>', `
    <!-- Report Modal -->
    <div id="report-modal" class="modal" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; align-items: center; justify-content: center;">
        <div class="modal-content glassmorphic" style="max-width: 450px; width: 90%; padding: 2rem;">
            <h3><i class="fa-solid fa-flag" style="color: #ef4444;"></i> Report Content</h3>
            <p style="color: rgba(255,255,255,0.6); font-size: 0.85rem; margin-bottom: 1rem;">Help us keep the community safe. What's wrong with this content?</p>
            <input type="hidden" id="report-target-type">
            <input type="hidden" id="report-target-id">
            <input type="hidden" id="report-target-user">
            
            <select id="report-category" style="width: 100%; padding: 0.8rem; border-radius: 6px; background: rgba(0,0,0,0.4); color: white; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 1rem;">
                <option value="spam">Spam or Misleading</option>
                <option value="harassment">Harassment or Bullying</option>
                <option value="inappropriate">Inappropriate/Explicit Content</option>
                <option value="guidelines">Breaks Community Guidelines</option>
            </select>
            
            <textarea id="report-reason" placeholder="Additional details (optional)..." style="width: 100%; height: 80px; padding: 0.8rem; border-radius: 6px; background: rgba(0,0,0,0.4); color: white; border: 1px solid rgba(255,255,255,0.1); margin-bottom: 1rem;"></textarea>
            
            <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                <button class="btn btn-secondary" onclick="document.getElementById('report-modal').style.display='none'">Cancel</button>
                <button class="btn btn-primary" id="btn-submit-report" style="background: #ef4444; border-color: #ef4444;">Submit Report</button>
            </div>
        </div>
    </div>
</body>`);
    fs.writeFileSync('public/community.html', html);
}

// 2. Add JS functions to community.js
let js = fs.readFileSync('public/community.js', 'utf8');
if (!js.includes('openReportModal')) {
    js += `
// Reporting Logic
window.openReportModal = function(targetType, targetId, targetUserId) {
    document.getElementById('report-target-type').value = targetType;
    document.getElementById('report-target-id').value = targetId;
    document.getElementById('report-target-user').value = targetUserId;
    document.getElementById('report-reason').value = '';
    document.getElementById('report-modal').style.display = 'flex';
};

const btnSubmitReport = document.getElementById('btn-submit-report');
if (btnSubmitReport) {
    btnSubmitReport.addEventListener('click', async () => {
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
                    'Authorization': \`Bearer \${token}\`
                },
                body: JSON.stringify({
                    target_type: targetType,
                    target_id: targetId,
                    reported_user_id: targetUser,
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
    });
}
`;
    fs.writeFileSync('public/community.js', js);
}
