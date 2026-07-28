const fs = require('fs');
let app = fs.readFileSync('public/app.js', 'utf8');

// 1. Remove the login check from FAQ Submission
const oldSubmitLogic = `        if (typeof currentUser === 'undefined' || !currentUser) {
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
            });`;

const newSubmitLogic = `        const faqForm = e.target;
        const questionInput = document.getElementById('faq-question-text');
        const questionText = questionInput.value.trim();
        
        if (!questionText) return;
        
        const submitBtn = faqForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
        submitBtn.disabled = true;

        try {
            const newFaqRef = firebase.database().ref('faq_submissions').push();
            
            // Allow anonymous submission
            const isAnon = (typeof currentUser === 'undefined' || !currentUser);
            
            await newFaqRef.set({
                question: questionText,
                studentId: isAnon ? 'Anonymous' : (currentUser.studentId || 'N/A'),
                studentName: isAnon ? 'Guest User' : (currentUser.name || 'Unknown'),
                email: isAnon ? 'N/A' : (currentUser.email || 'N/A'),
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                status: 'pending',
                bookmarked: false
            });`;

app = app.replace(oldSubmitLogic, newSubmitLogic);

// 2. Add Bookmarking to Admin UI & Admin Logic
const oldAdminLogic = `            const tr = document.createElement('tr');
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
};`;

const newAdminLogic = `            // Highlight bookmarked rows
            const bgStyle = sub.bookmarked ? 'background: rgba(223, 177, 91, 0.08);' : '';
            const starIcon = sub.bookmarked ? '<i class="fa-solid fa-star" style="color:#dfb15b;"></i>' : '<i class="fa-regular fa-star"></i>';
            
            const tr = document.createElement('tr');
            tr.style = bgStyle;
            tr.innerHTML = \`
                <td style="color: rgba(255,255,255,0.6); font-size: 0.8rem;">\${dateStr}</td>
                <td style="font-weight: 600; color: #fff;">\${escapeHTML(sub.studentName)}</td>
                <td style="color: #dfb15b; font-family: monospace;">\${escapeHTML(sub.studentId)}</td>
                <td style="color: rgba(255,255,255,0.85); max-width: 300px; word-wrap: break-word;">\${escapeHTML(sub.question)}</td>
                <td style="display: flex; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-sm" onclick="bookmarkFAQ('\${sub.id}', \${sub.bookmarked || false})" title="Bookmark this question" style="font-size: 0.8rem; padding: 0.4rem 0.6rem; border-color: rgba(223, 177, 91, 0.3); color: #dfb15b; background: transparent;">
                        \${starIcon}
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="removeFAQ('\${sub.id}')" title="Remove question" style="font-size: 0.7rem; padding: 0.4rem 0.6rem; border-color: rgba(235, 76, 66, 0.3); color: #EB4C42;">
                        <i class="fa-solid fa-trash"></i> Remove
                    </button>
                </td>
            \`;
            faqsBody.appendChild(tr);
        });
    });
}

// Admin Action: Bookmark FAQ
window.bookmarkFAQ = async function(id, currentState) {
    try {
        await firebase.database().ref('faq_submissions/' + id).update({
            bookmarked: !currentState
        });
        showToast(currentState ? 'Bookmark removed.' : 'Question bookmarked!', 'success');
    } catch (error) {
        console.error('Error bookmarking FAQ:', error);
        showToast('Failed to update bookmark.', 'error');
    }
};

// Admin Action: Remove FAQ
window.removeFAQ = async function(id) {
    if (!confirm('Are you sure you want to permanently delete this question?')) return;
    
    try {
        await firebase.database().ref('faq_submissions/' + id).remove();
        showToast('Question removed.', 'success');
    } catch (error) {
        console.error('Error removing FAQ:', error);
        showToast('Failed to remove question.', 'error');
    }
};`;

app = app.replace(oldAdminLogic, newAdminLogic);

fs.writeFileSync('public/app.js', app, 'utf8');
console.log('Fixed anonymous FAQs & bookmarking');
