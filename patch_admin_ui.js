const fs = require('fs');

// Patch index.html
let html = fs.readFileSync('public/index.html', 'utf8');

const oldRulesDesc = `<p class="section-desc">Manage values directly inside the database settings. Adjust parameters below to dynamically update loyalty points multipliers, conversion ratios, and tier caps across the entire system without editing any code.</p>`;
const newRulesDesc = `<p class="section-desc" style="color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.2); padding: 1rem; border-radius: 8px; background: rgba(74, 222, 128, 0.05); margin-bottom: 2rem;">
                          <strong>How to use this section:</strong><br>
                          The values below control exactly how many points students get for referrals and how point-to-cash conversions work. 
                          You only need to edit these values when the Admin Team decides to run a promotion (e.g. increasing "New Joiner Points" during a holiday) or wants to change the standard rewards policy. Changing and saving these rules instantly updates the math for the entire system without needing a developer!
                      </p>`;
html = html.replace(oldRulesDesc, newRulesDesc);

const oldResetBtn = `<button class="btn btn-secondary" onclick="resetDatabaseState(this)" style="background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.25); color: #ef4444; font-weight: 700; display: flex; align-items: center; gap: 0.4rem;">
                            <i class="fa-solid fa-rotate"></i> Reset Database State
                        </button>`;
const newResetBtn = `<button class="btn btn-secondary" onclick="resetDatabaseState(this)" style="background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.5); color: #ef4444; font-weight: 700; display: flex; align-items: center; gap: 0.4rem; padding: 0.8rem 1.5rem;">
                            <i class="fa-solid fa-skull-crossbones"></i> WIPE DATABASE (DANGER)
                        </button>
                        <p style="font-size: 0.8rem; color: #ef4444; max-width: 300px; line-height: 1.4;">Only use this if you want to completely destroy all users, points, and logs and start fresh with simulated demo data.</p>`;
html = html.replace(oldResetBtn, newResetBtn);
fs.writeFileSync('public/index.html', html, 'utf8');

// Patch app.js
let app = fs.readFileSync('public/app.js', 'utf8');
const oldResetFunc = `if (!confirm("Are you sure you want to drop all database tables and restore default seeded profiles? This cannot be undone.")) return;`;
const newResetFunc = `const confirmText = prompt("WARNING: This will DESTROY ALL USER ACCOUNTS, POINTS, AND REFERRALS.\\n\\nTo proceed, please type: RESET DATABASE");
    if (confirmText !== "RESET DATABASE") {
        alert("Reset aborted.");
        return;
    }`;
app = app.replace(oldResetFunc, newResetFunc);
fs.writeFileSync('public/app.js', app, 'utf8');

console.log('Patched index.html and app.js');
