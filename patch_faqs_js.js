const fs = require('fs');

let app = fs.readFileSync('public/app.js', 'utf8');

const faqJsLogic = `
// ----------------------------------------------------
// FAQ MODULE (STUDENT SUBMISSION & ADMIN VIEW)
// ----------------------------------------------------

window.showFAQModal = function() {
    const modal = document.getElementById('faq-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    
    if (window.gsap) {
        gsap.fromTo(modal.querySelector('.card'), 
            { y: 20, opacity: 0, scale: 0.95 },
            { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.2)" }
        );
    }
};

// Handle Student FAQ Submission
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
            
            showToast('Your question has been sent to the admin team!', 'success');
            questionInput.value = '';
            document.getElementById('faq-modal').style.display = 'none';
        } catch (error) {
            console.error('FAQ submission error:', error);
            showToast('Failed to submit question. Please try again.', 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// Admin Dashboard: Render FAQs
function initAdminFAQs() {
    const faqsBody = document.getElementById('admin-faqs-body');
    if (!faqsBody) return;
    
    firebase.database().ref('faq_submissions').on('value', (snapshot) => {
        faqsBody.innerHTML = '';
        const data = snapshot.val();
        
        if (!data) {
            faqsBody.innerHTML = '<tr><td colspan="5" class="no-data" style="text-align: center; color: rgba(255,255,255,0.4); padding: 2rem;">No questions have been submitted yet.</td></tr>';
            return;
        }
        
        const submissions = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        // Sort newest first
        submissions.sort((a, b) => b.timestamp - a.timestamp);
        
        submissions.forEach(sub => {
            const dateStr = new Date(sub.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            
            const tr = document.createElement('tr');
            tr.innerHTML = \`
                <td style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">\${dateStr}</td>
                <td style="font-weight: 600; color: #fff;">\${escapeHTML(sub.studentName)}</td>
                <td style="color: #dfb15b; font-family: monospace;">\${escapeHTML(sub.studentId)}</td>
                <td style="color: rgba(255,255,255,0.85); max-width: 300px; word-wrap: break-word;">\${escapeHTML(sub.question)}</td>
                <td>
                    <button class="btn btn-secondary btn-sm" onclick="resolveFAQ('\${sub.id}')" style="font-size: 0.7rem; padding: 0.4rem 0.6rem; border-color: rgba(74, 222, 128, 0.3); color: #4ade80;">
                        <i class="fa-solid fa-check"></i> Resolve
                    </button>
                </td>
            \`;
            faqsBody.appendChild(tr);
        });
    });
}

// Admin Action: Resolve FAQ
window.resolveFAQ = async function(id) {
    if (!confirm('Mark this question as resolved and remove it from the inbox?')) return;
    
    try {
        await firebase.database().ref('faq_submissions/' + id).remove();
        showToast('Question resolved.', 'success');
    } catch (error) {
        console.error('Error resolving FAQ:', error);
        showToast('Failed to resolve question.', 'error');
    }
};

// Hook into existing initAdminDashboard
const originalInitAdminDashboard = window.initAdminDashboard;
if (typeof originalInitAdminDashboard === 'function') {
    window.initAdminDashboard = function() {
        originalInitAdminDashboard();
        initAdminFAQs();
    };
} else {
    // If it doesn't exist globally yet, we attach an event or wait for it
    setTimeout(() => {
        if (typeof window.initAdminDashboard === 'function') {
            const oldInit = window.initAdminDashboard;
            window.initAdminDashboard = function() {
                oldInit();
                initAdminFAQs();
            };
        }
    }, 1000);
}
`;

if (!app.includes('window.showFAQModal')) {
    app += '\n' + faqJsLogic;
    fs.writeFileSync('public/app.js', app, 'utf8');
}
console.log('app.js updated with FAQ logic!');
