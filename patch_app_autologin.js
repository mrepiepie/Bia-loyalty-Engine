const fs = require('fs');

let content = fs.readFileSync('public/app.js', 'utf8');

const targetFunction = "function playIntroPreloader() {";

const autoLoginLogic = `
async function attemptAutoLogin() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
        const response = await fetch(\`\${API_BASE}/auth/me\`);
        const data = await response.json();
        
        if (response.ok && data.user) {
            appState.currentUser = data.user;
            
            // Update UI based on role
            const adminNav = document.querySelector('a[data-tab="admin-vouchers-mgmt"]');
            if (adminNav) {
                adminNav.style.display = data.user.role === 'admin' ? 'flex' : 'none';
            }
            
            return true;
        } else {
            localStorage.removeItem('token');
            return false;
        }
    } catch (err) {
        return false;
    }
}

async function playIntroPreloader() {
`;

if (!content.includes('attemptAutoLogin')) {
    content = content.replace(targetFunction, autoLoginLogic);
}

// Modify playIntroPreloader to use auto login
const targetPreloaderEnd = `      if (loginOverlay) {
          loginOverlay.style.display = 'block';
          loginOverlay.style.opacity = '1';`;
          
const replacementPreloaderEnd = `      if (loginOverlay) {
          const loggedIn = await attemptAutoLogin();
          if (loggedIn) {
              loginOverlay.style.display = 'none';
              document.body.classList.remove('landing-active');
              showPortalDashboard();
              return;
          }
          
          loginOverlay.style.display = 'block';
          loginOverlay.style.opacity = '1';`;

if (!content.includes('await attemptAutoLogin()')) {
    content = content.replace(targetPreloaderEnd, replacementPreloaderEnd);
}

fs.writeFileSync('public/app.js', content);
console.log("Patched app.js to auto-login.");
