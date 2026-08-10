const fs = require('fs');
let js = fs.readFileSync('public/app.js', 'utf8');

// Find the health polling logic and insert the community polling logic alongside it
const toFind = `// Hook into the tab navigation to start/stop polling
document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.nav-tab');
    if (tabBtn) {
        if (tabBtn.getAttribute('data-target') === 'admin-health') {
            fetchSystemHealth(); // Fetch immediately
            if (!healthPollInterval) {
                healthPollInterval = setInterval(fetchSystemHealth, 2000); // Poll every 2 seconds
            }
        } else {
            // Stop polling if we navigate away
            if (healthPollInterval) {
                clearInterval(healthPollInterval);
                healthPollInterval = null;
            }
        }
    }
});`;

const toReplace = `let adminCommunityPollInterval = null;

// Hook into the tab navigation to start/stop polling
document.addEventListener('click', (e) => {
    const tabBtn = e.target.closest('.nav-tab');
    if (tabBtn) {
        const target = tabBtn.getAttribute('data-target');
        
        // Health Dashboard Polling
        if (target === 'admin-health') {
            fetchSystemHealth();
            if (!healthPollInterval) healthPollInterval = setInterval(fetchSystemHealth, 2000);
        } else {
            if (healthPollInterval) {
                clearInterval(healthPollInterval);
                healthPollInterval = null;
            }
        }
        
        // Community Hub Polling
        if (target === 'admin-community-hub') {
            loadAdminCommunityHub();
            if (!adminCommunityPollInterval) adminCommunityPollInterval = setInterval(loadAdminCommunityHub, 5000); // Poll every 5 seconds
        } else {
            if (adminCommunityPollInterval) {
                clearInterval(adminCommunityPollInterval);
                adminCommunityPollInterval = null;
            }
        }
    }
});`;

if (js.includes('healthPollInterval = setInterval(fetchSystemHealth, 2000);')) {
    js = js.replace(toFind, toReplace);
    fs.writeFileSync('public/app.js', js);
    console.log('Successfully injected admin community polling');
} else {
    console.log('Could not find the target string');
}
