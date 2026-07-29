const fs = require('fs');

// Patch index.html
let html = fs.readFileSync('public/index.html', 'utf8');

const recoveryFormHtml = `
                    <form id="recovery-form">
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label>Registered Email or Student ID</label>
                            <input type="text" id="recovery-identifier" required placeholder="e.g. sarah@email.com or BIA-2024-9042">
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;">
                            <i class="fa-solid fa-paper-plane"></i> Send Verification Code
                        </button>
                        <div style="text-align: center; margin-bottom: 1.5rem;">
                            <a href="#" class="forgot-link" id="link-back-login">Back to Sign In</a>
                        </div>
                    </form>

                    <form id="verify-form" style="display: none;">
                        <p style="color: #4ade80; font-size: 0.85rem; margin-bottom: 1rem; text-align: center;"><i class="fa-solid fa-envelope-circle-check"></i> Code sent! Check your email.</p>
                        <div class="form-group" style="margin-bottom: 1.25rem;">
                            <label>6-Digit Verification Code</label>
                            <input type="text" id="verify-code-input" required placeholder="123456" pattern="[0-9]{6}" maxlength="6" style="text-align: center; font-size: 1.2rem; letter-spacing: 4px;">
                        </div>
                        <button type="submit" class="btn btn-primary" style="width: 100%; margin-bottom: 1rem;">
                            <i class="fa-solid fa-unlock-keyhole"></i> Verify & Reveal Credentials
                        </button>
                        <div style="text-align: center; margin-bottom: 1.5rem;">
                            <a href="#" class="forgot-link" onclick="document.getElementById('verify-form').style.display='none'; document.getElementById('recovery-form').style.display='block';">Try another email</a>
                        </div>
                    </form>
`;

html = html.replace(/<form id="recovery-form">[\s\S]*?<\/form>/, recoveryFormHtml);
// Bump Cache
html = html.replace(/app\.js\?v=1\.3\.[0-9]+/g, 'app.js?v=1.3.17');

fs.writeFileSync('public/index.html', html, 'utf8');


// Patch app.js
let appJs = fs.readFileSync('public/app.js', 'utf8');

const oldRecoveryJS = `document.getElementById('recovery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('recovery-identifier').value.trim();

    try {
        const response = await fetch(\`\${API_BASE}/auth/retrieve-password\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Recovery lookup failed');

        // Populate match values
        document.getElementById('lbl-recovered-name').textContent = data.user.name;
        document.getElementById('lbl-recovered-email').textContent = data.user.email;
        document.getElementById('lbl-recovered-pass').textContent = data.user.password;

        // Slide out forgot form and reveal results overlay card
        const forgotView = document.getElementById('forgot-password-view');
        const resultView = document.getElementById('recovery-result-view');

        if (window.gsap) {
            gsap.to(forgotView, {
                opacity: 0,
                y: -10,
                duration: 0.3,
                onComplete: () => {
                    forgotView.style.display = 'none';
                    resultView.style.display = 'block';
                    gsap.fromTo(resultView, {opacity: 0, scale: 0.95}, {opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.5)"});
                }
            });
        } else {
            forgotView.style.display = 'none';
            resultView.style.display = 'block';
        }
    } catch (err) {
        showToast('Error', err.message, 'error');
    }
});`;

const newRecoveryJS = `
// Step 1: Request Code
document.getElementById('recovery-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('recovery-identifier').value.trim();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Sending...';
    btn.disabled = true;

    try {
        const response = await fetch(\`\${API_BASE}/auth/retrieve-password\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Lookup failed');

        // Show step 2 form
        document.getElementById('recovery-form').style.display = 'none';
        document.getElementById('verify-form').style.display = 'block';
        document.getElementById('verify-code-input').focus();
    } catch (err) {
        showToast('Error', err.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

// Step 2: Verify Code
const verifyForm = document.getElementById('verify-form');
if (verifyForm) {
    verifyForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const identifier = document.getElementById('recovery-identifier').value.trim();
        const code = document.getElementById('verify-code-input').value.trim();
        const btn = e.target.querySelector('button[type="submit"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Verifying...';
        btn.disabled = true;

        try {
            const response = await fetch(\`\${API_BASE}/auth/verify-code\`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, code })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Verification failed');

            // Success, populate match values
            document.getElementById('lbl-recovered-name').textContent = data.user.name;
            document.getElementById('lbl-recovered-email').textContent = data.user.email;
            document.getElementById('lbl-recovered-pass').textContent = data.user.password;

            // Transition UI
            const forgotView = document.getElementById('forgot-password-view');
            const resultView = document.getElementById('recovery-result-view');

            if (window.gsap) {
                gsap.to(forgotView, {
                    opacity: 0,
                    y: -10,
                    duration: 0.3,
                    onComplete: () => {
                        forgotView.style.display = 'none';
                        resultView.style.display = 'block';
                        gsap.fromTo(resultView, {opacity: 0, scale: 0.95}, {opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.5)"});
                    }
                });
            } else {
                forgotView.style.display = 'none';
                resultView.style.display = 'block';
            }
        } catch (err) {
            showToast('Error', err.message, 'error');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}`;

// I need to use regex properly since newlines might not match perfectly.
appJs = appJs.replace(/document\.getElementById\('recovery-form'\)\.addEventListener\('submit'[\s\S]*?showToast\('Error', err\.message, 'error'\);\s*\}\s*\}\);/, newRecoveryJS);

fs.writeFileSync('public/app.js', appJs, 'utf8');

console.log('Patched index.html and app.js');
