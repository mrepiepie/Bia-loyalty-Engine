const fs = require('fs');
let app = fs.readFileSync('public/app.js', 'utf8');

const oldLogic = `// Handle Student FAQ Submission
const faqForm = document.getElementById('faq-submit-form');
if (faqForm) {
    faqForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            showToast('You must be logged in to ask a question.', 'error');
            return;
        }

        const questionInput = document.getElementById('faq-question-text');
        const questionText = questionInput.value.trim();
        
        if (!questionText) return;
        
        const submitBtn = faqForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;`;

const newLogic = `// Handle Student FAQ Submission via Event Delegation
document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'faq-submit-form') {
        e.preventDefault();
        
        if (!currentUser) {
            showToast('You must be logged in to ask a question.', 'error');
            return;
        }

        const faqForm = e.target;
        const questionInput = document.getElementById('faq-question-text');
        const questionText = questionInput.value.trim();
        
        if (!questionText) return;
        
        const submitBtn = faqForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;`;

// And we need to replace the closing brace of the if(faqForm) block
// Wait, replacing a specific closing brace is hard with string replacement.
// Let's just do a regex that captures the entire block.
const fullOldLogic = `// Handle Student FAQ Submission
const faqForm = document.getElementById('faq-submit-form');
if (faqForm) {
    faqForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!currentUser) {
            showToast('You must be logged in to ask a question.', 'error');
            return;
        }

        const questionInput = document.getElementById('faq-question-text');
        const questionText = questionInput.value.trim();
        
        if (!questionText) return;
        
        const submitBtn = faqForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        try {
            const newFaqRef = firebase.database().ref('faq_submissions').push();
            await newFaqRef.set({
                question: questionText,
                studentId: currentUser.studentId || 'N/A',
                studentName: currentUser.name || 'Unknown',
                email: currentUser.email || 'N/A',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                status: 'pending'
            });
            
            questionInput.value = '';
            document.getElementById('faq-form-container').style.display = 'none';
            const successMsg = document.getElementById('faq-success-msg');
            successMsg.style.display = 'block';
            
            if (window.gsap) {
                gsap.fromTo(successMsg, { opacity: 0, y: 15, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.5)" });
            }
        } catch (error) {
            console.error('FAQ submission error:', error);
            showToast('Failed to submit question. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}`;

const fullNewLogic = `// Handle Student FAQ Submission via Event Delegation
document.addEventListener('submit', async (e) => {
    if (e.target && e.target.id === 'faq-submit-form') {
        e.preventDefault();
        
        if (typeof currentUser === 'undefined' || !currentUser) {
            // Check if showToast exists, if not just alert
            if (typeof showToast === 'function') {
                showToast('You must be logged in to ask a question.', 'error');
            } else {
                alert('You must be logged in to ask a question.');
            }
            return;
        }

        const faqForm = e.target;
        const questionInput = document.getElementById('faq-question-text');
        const questionText = questionInput.value.trim();
        
        if (!questionText) return;
        
        const submitBtn = faqForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        try {
            const newFaqRef = firebase.database().ref('faq_submissions').push();
            await newFaqRef.set({
                question: questionText,
                studentId: currentUser.studentId || 'N/A',
                studentName: currentUser.name || 'Unknown',
                email: currentUser.email || 'N/A',
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                status: 'pending'
            });
            
            questionInput.value = '';
            const formContainer = document.getElementById('faq-form-container');
            if(formContainer) formContainer.style.display = 'none';
            const successMsg = document.getElementById('faq-success-msg');
            if(successMsg) {
                successMsg.style.display = 'block';
                if (window.gsap) {
                    gsap.fromTo(successMsg, { opacity: 0, y: 15, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "back.out(1.5)" });
                }
            }
        } catch (error) {
            console.error('FAQ submission error:', error);
            if (typeof showToast === 'function') showToast('Failed to submit question. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }
});`;

app = app.replace(fullOldLogic, fullNewLogic);
fs.writeFileSync('public/app.js', app, 'utf8');
console.log('Fixed FAQ event listener');
