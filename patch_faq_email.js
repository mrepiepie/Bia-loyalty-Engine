const fs = require('fs');

// --- Patch index.html ---
let indexHtml = fs.readFileSync('public/index.html', 'utf8');
const oldFormStart = `<form id="faq-submit-form" style="display: flex; flex-direction: column; gap: 0.75rem;">
                          <textarea id="faq-question-text"`;
const newFormStart = `<form id="faq-submit-form" style="display: flex; flex-direction: column; gap: 0.75rem;">
                          <input type="email" id="faq-email-input" placeholder="Your Email Address (Optional)" style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 0.75rem; color: #fff; font-family: inherit; font-size: 0.9rem; box-sizing: border-box; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='rgba(223,177,91,0.5)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'">
                          <textarea id="faq-question-text"`;
indexHtml = indexHtml.replace(oldFormStart, newFormStart);
fs.writeFileSync('public/index.html', indexHtml, 'utf8');

// --- Patch app.js ---
let appJs = fs.readFileSync('public/app.js', 'utf8');

// 1. Submit logic
const oldSubmitLogic = `        const faqForm = e.target;
        const questionInput = document.getElementById('faq-question-text');
        const questionText = questionInput.value.trim();
        
        if (!questionText) return;`;

const newSubmitLogic = `        const faqForm = e.target;
        const questionInput = document.getElementById('faq-question-text');
        const questionText = questionInput.value.trim();
        
        const emailInput = document.getElementById('faq-email-input');
        const emailText = emailInput ? emailInput.value.trim() : '';
        
        if (!questionText) return;`;
appJs = appJs.replace(oldSubmitLogic, newSubmitLogic);

// 2. Fetch body email field
const oldFetchEmail = `email: isAnon ? 'N/A' : (currentUser.email || 'N/A')`;
const newFetchEmail = `email: isAnon ? (emailText || 'N/A') : (currentUser.email || emailText || 'N/A')`;
appJs = appJs.replace(oldFetchEmail, newFetchEmail);

// 3. Clear email input
const oldClearInput = `questionInput.value = '';`;
const newClearInput = `questionInput.value = '';
            if (emailInput) emailInput.value = '';`;
appJs = appJs.replace(oldClearInput, newClearInput);

// 4. Admin UI to show email
const oldAdminUI = `<td style="font-weight: 600; color: #fff;">\${escapeHTML(sub.student_name || sub.studentName || 'Unknown')}</td>`;
const newAdminUI = `<td style="font-weight: 600; color: #fff;">
                    \${escapeHTML(sub.student_name || sub.studentName || 'Unknown')}<br>
                    <span style="font-size: 0.75rem; color: rgba(255,255,255,0.5); font-weight: normal;">\${escapeHTML(sub.email && sub.email !== 'N/A' ? sub.email : 'No email provided')}</span>
                </td>`;
appJs = appJs.replace(oldAdminUI, newAdminUI);

fs.writeFileSync('public/app.js', appJs, 'utf8');
console.log('Patched index.html and app.js for FAQ email input');
