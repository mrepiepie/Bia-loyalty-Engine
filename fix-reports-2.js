const fs = require('fs');

let js = fs.readFileSync('public/community.js', 'utf8');

// Ensure we append the actual function if it's not defined
if (!js.includes('window.openReportModal = function')) {
    js += `

// Reporting Logic
window.openReportModal = function(targetType, targetId, targetUserId) {
    document.getElementById('report-target-type').value = targetType;
    document.getElementById('report-target-id').value = targetId;
    document.getElementById('report-target-user').value = targetUserId || '';
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
    });
}
`;
    fs.writeFileSync('public/community.js', js);
}
