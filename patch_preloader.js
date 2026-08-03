const fs = require('fs');
let c = fs.readFileSync('public/app.js', 'utf8');

const targetFunctionMatch = /async function playIntroPreloader\(\)\s*\{\s*\/\/ \-+\s*\/\/ REAL-TIME/;

const replacement = `async function playIntroPreloader() {

    const loader = document.getElementById('loader-screen');
    const loginOverlay = document.getElementById('login-overlay');
    
    if (loader) {
        loader.remove();
    }
    
    if (loginOverlay) {
        const loggedIn = await attemptAutoLogin();
        if (loggedIn) {
            loginOverlay.style.display = 'none';
            document.body.classList.remove('landing-active');
            showPortalDashboard();
            return;
        }

        loginOverlay.style.display = 'block';
        loginOverlay.style.opacity = '1';
        document.body.classList.add('landing-active');
        if (typeof animateLandingText === 'function') {
            animateLandingText();
        }
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    }
}

// ----------------------------------------------------
// REAL-TIME`;

if (c.match(targetFunctionMatch)) {
    c = c.replace(targetFunctionMatch, replacement);
    fs.writeFileSync('public/app.js', c);
    console.log('Successfully patched playIntroPreloader!');
} else {
    console.log('Could not find the target match!');
}
