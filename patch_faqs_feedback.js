const fs = require('fs');

// --- 1. Modify index.html ---
let index = fs.readFileSync('public/index.html', 'utf8');

// A. Move Admin FAQs tab to the top of the admin sidebar (right under the student-only tabs)
index = index.replace(
    '<button class="nav-tab admin-only" data-target="admin-faqs"><i class="fa-solid fa-circle-question"></i> FAQs (Inbox)</button>',
    ''
); // Remove it from the bottom

index = index.replace(
    '<!-- Admin Navigation -->',
    '<!-- Admin Navigation -->\n                <button class="nav-tab admin-only" data-target="admin-faqs" style="color: #dfb15b;"><i class="fa-solid fa-circle-question"></i> FAQs (Inbox)</button>'
); // Add it to the top

// B. Swap the order of "Submit Form" and "Basic Questions" inside the FAQ modal
// and add a success message container.
const oldModalSection = `
                <!-- Basic Questions -->
                <div class="faq-list" style="display: flex; flex-direction: column; gap: 1rem;">
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 1rem;">
                        <strong style="color: #dfb15b; display: block; margin-bottom: 0.4rem; font-size: 0.95rem;">How do I earn Loyalty Points?</strong>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.5;">Points are earned by logging in daily, maintaining a high GPA, attending BIA executive webinars, and referring friends who successfully enroll.</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 1rem;">
                        <strong style="color: #dfb15b; display: block; margin-bottom: 0.4rem; font-size: 0.95rem;">When do my points or vouchers expire?</strong>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.5;">Loyalty points expire 12 months after issuance. Vouchers typically remain valid for 90 days after generation, unless stated otherwise.</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 1rem;">
                        <strong style="color: #dfb15b; display: block; margin-bottom: 0.4rem; font-size: 0.95rem;">Can I transfer points to a friend?</strong>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.5;">Yes! You can transfer points peer-to-peer from the Overview dashboard. Note that a 10% system tax is deducted from the sent amount.</p>
                    </div>
                </div>

                <!-- Submit Form -->
                <div style="border-top: 1px solid rgba(255,255,255,0.08); padding-top: 1.5rem;">
                    <h4 style="margin-top: 0; margin-bottom: 1rem; color: #EFECE3;"><i class="fa-solid fa-paper-plane" style="color: #dfb15b; font-size: 1rem; margin-right: 0.4rem;"></i> Ask a Question</h4>
                    <form id="faq-submit-form" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <textarea id="faq-question-text" required placeholder="Type your question here... Our admin team will review it." style="background: rgba(0, 0, 0, 0.35); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 0.75rem; color: #fff; font-family: inherit; font-size: 0.85rem; min-height: 80px; resize: vertical; box-sizing: border-box;"></textarea>
                        <button type="submit" class="btn btn-primary" style="align-self: flex-end; display: flex; align-items: center; gap: 0.5rem; font-weight: 700;">
                            Submit Question <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </form>
                </div>`;

const newModalSection = `
                <!-- Submit Form (Moved to top) -->
                <div id="faq-form-container" style="background: rgba(223, 177, 91, 0.05); border: 1px solid rgba(223, 177, 91, 0.2); border-radius: 12px; padding: 1.25rem;">
                    <h4 style="margin-top: 0; margin-bottom: 0.75rem; color: #dfb15b; font-size: 1.1rem;"><i class="fa-solid fa-paper-plane" style="margin-right: 0.4rem;"></i> Ask the Admin Team</h4>
                    <form id="faq-submit-form" style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <textarea id="faq-question-text" required placeholder="Type your question here... We will review and reply shortly." style="background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 0.75rem; color: #fff; font-family: inherit; font-size: 0.9rem; min-height: 80px; resize: vertical; box-sizing: border-box; outline: none; transition: border-color 0.2s;" onfocus="this.style.borderColor='rgba(223,177,91,0.5)'" onblur="this.style.borderColor='rgba(255,255,255,0.1)'"></textarea>
                        <button type="submit" class="btn btn-primary" style="align-self: flex-end; display: flex; align-items: center; gap: 0.5rem; font-weight: 700;">
                            Submit Question <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </form>
                </div>
                
                <!-- Success Message Container -->
                <div id="faq-success-msg" style="display: none; background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; padding: 2rem; text-align: center;">
                    <i class="fa-solid fa-circle-check" style="color: #4ade80; font-size: 3rem; margin-bottom: 1rem;"></i>
                    <h3 style="color: #4ade80; margin-top: 0; margin-bottom: 0.5rem;">Question Submitted!</h3>
                    <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 0.95rem;">Our admin team has received your query and will get back to you soon.</p>
                </div>

                <!-- Basic Questions (Moved to bottom) -->
                <div class="faq-list" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem;">
                    <h4 style="margin: 0; color: #EFECE3; font-size: 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem;">Common Answers</h4>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 1rem;">
                        <strong style="color: #dfb15b; display: block; margin-bottom: 0.4rem; font-size: 0.95rem;">How do I earn Loyalty Points?</strong>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.5;">Points are earned by logging in daily, maintaining a high GPA, attending BIA executive webinars, and referring friends who successfully enroll.</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 1rem;">
                        <strong style="color: #dfb15b; display: block; margin-bottom: 0.4rem; font-size: 0.95rem;">When do my points or vouchers expire?</strong>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.5;">Loyalty points expire 12 months after issuance. Vouchers typically remain valid for 90 days after generation, unless stated otherwise.</p>
                    </div>
                    <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 1rem;">
                        <strong style="color: #dfb15b; display: block; margin-bottom: 0.4rem; font-size: 0.95rem;">Can I transfer points to a friend?</strong>
                        <p style="color: rgba(255,255,255,0.7); font-size: 0.85rem; margin: 0; line-height: 1.5;">Yes! You can transfer points peer-to-peer from the Overview dashboard. Note that a 10% system tax is deducted from the sent amount.</p>
                    </div>
                </div>`;

index = index.replace(oldModalSection, newModalSection);
fs.writeFileSync('public/index.html', index, 'utf8');


// --- 2. Modify app.js ---
let app = fs.readFileSync('public/app.js', 'utf8');

// Change the success behavior from closing the modal to showing the success div
const oldSuccessCode = `            showToast('Your question has been sent to the admin team!', 'success');
            questionInput.value = '';
            document.getElementById('faq-modal').style.display = 'none';`;

const newSuccessCode = `            questionInput.value = '';
            document.getElementById('faq-form-container').style.display = 'none';
            const successMsg = document.getElementById('faq-success-msg');
            successMsg.style.display = 'block';
            
            if (window.gsap) {
                gsap.fromTo(successMsg, { opacity: 0, y: 15, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.5)" });
            }`;

app = app.replace(oldSuccessCode, newSuccessCode);

// Add a reset to the modal opening function so the form is visible again when reopened
const oldModalOpenCode = `    if (window.gsap) {
        gsap.fromTo(modal.querySelector('.card'), `;

const newModalOpenCode = `    
    // Reset form state if it was submitted previously
    const formContainer = document.getElementById('faq-form-container');
    const successMsg = document.getElementById('faq-success-msg');
    if (formContainer && successMsg) {
        formContainer.style.display = 'block';
        successMsg.style.display = 'none';
    }

    if (window.gsap) {
        gsap.fromTo(modal.querySelector('.card'), `;

app = app.replace(oldModalOpenCode, newModalOpenCode);

fs.writeFileSync('public/app.js', app, 'utf8');

console.log('UI feedback changes applied successfully.');
