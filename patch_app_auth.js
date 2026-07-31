const fs = require('fs');

let content = fs.readFileSync('public/app.js', 'utf8');

// 1. Intercept fetch to add JWT token
const fetchInterceptor = `
// Intercept fetch to append JWT
const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    if (typeof resource === 'string' && resource.startsWith(API_BASE)) {
        const token = localStorage.getItem('token');
        if (token) {
            config = config || {};
            config.headers = {
                ...config.headers,
                'Authorization': \`Bearer \${token}\`
            };
        }
    }
    return originalFetch(resource, config);
};
`;

if (!content.includes('originalFetch = window.fetch')) {
    content = content.replace("const API_BASE = '/api';", "const API_BASE = '/api';" + fetchInterceptor);
}

// 2. Save token on login
const loginReplacement = `appState.currentUser = data.user;
        localStorage.setItem('token', data.token);`;

content = content.replace("appState.currentUser = data.user;", loginReplacement);

// 3. Clear token on logout
const logoutTarget = "appState.currentUser = null;";
const logoutReplacement = `appState.currentUser = null;
    localStorage.removeItem('token');`;
    
if (!content.includes("localStorage.removeItem('token')")) {
    content = content.replace(logoutTarget, logoutReplacement);
}

// 4. Hide admin tab if not admin
const updateAdminNavTarget = `// Update profile UI
    document.getElementById('profile-name').textContent = appState.currentUser.name;`;

const updateAdminNavReplacement = `// Update profile UI
    document.getElementById('profile-name').textContent = appState.currentUser.name;
    
    // Hide Admin panel nav item if not admin
    const adminNav = document.querySelector('a[data-tab="admin-vouchers-mgmt"]');
    if (adminNav) {
        if (appState.currentUser.role === 'admin') {
            adminNav.style.display = 'flex';
        } else {
            adminNav.style.display = 'none';
        }
    }
`;
if (!content.includes("adminNav.style.display = 'none'")) {
    content = content.replace(updateAdminNavTarget, updateAdminNavReplacement);
}


fs.writeFileSync('public/app.js', content);
console.log("Patched app.js with JWT handling and RBAC UI logic.");
