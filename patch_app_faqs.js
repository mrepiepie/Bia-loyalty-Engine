const fs = require('fs');
let app = fs.readFileSync('public/app.js', 'utf8');

// 1. Update Submit Logic
const oldSubmitLogic = `        try {
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

const newSubmitLogic = `        try {
            const isAnon = (typeof currentUser === 'undefined' || !currentUser);
            const response = await fetch('/api/faqs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: questionText,
                    studentId: isAnon ? 'Anonymous' : (currentUser.studentId || 'N/A'),
                    studentName: isAnon ? 'Guest User' : (currentUser.name || 'Unknown'),
                    email: isAnon ? 'N/A' : (currentUser.email || 'N/A')
                })
            });
            
            if (!response.ok) throw new Error('Failed to submit');
`;

app = app.replace(oldSubmitLogic, newSubmitLogic);

// 2. Update Admin FAQs initialization to fetch from API
const oldInitAdminFAQs = `function initAdminFAQs() {
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
        submissions.sort((a, b) => b.timestamp - a.timestamp);`;

const newInitAdminFAQs = `async function initAdminFAQs() {
    const faqsBody = document.getElementById('admin-faqs-body');
    if (!faqsBody) return;
    
    try {
        const response = await fetch('/api/admin/faqs');
        const data = await response.json();
        const submissions = data.faqs || [];
        
        faqsBody.innerHTML = '';
        if (submissions.length === 0) {
            faqsBody.innerHTML = '<tr><td colspan="5" class="no-data" style="text-align: center; color: rgba(255,255,255,0.4); padding: 2rem;">No questions have been submitted yet.</td></tr>';
            return;
        }
        
        // submissions is already sorted by DESC from DB`;

app = app.replace(oldInitAdminFAQs, newInitAdminFAQs);

// 3. Update Bookmark logic
const oldBookmarkLogic = `window.bookmarkFAQ = async function(id, currentState) {
    try {
        await firebase.database().ref('faq_submissions/' + id).update({
            bookmarked: !currentState
        });
        showToast(currentState ? 'Bookmark removed.' : 'Question bookmarked!', 'success');
    } catch (error) {
        console.error('Error bookmarking FAQ:', error);
        showToast('Failed to update bookmark.', 'error');
    }
};`;

const newBookmarkLogic = `window.bookmarkFAQ = async function(id, currentState) {
    try {
        const response = await fetch('/api/admin/faqs/' + id + '/bookmark', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bookmarked: !currentState })
        });
        if (!response.ok) throw new Error('Update failed');
        showToast(currentState ? 'Bookmark removed.' : 'Question bookmarked!', 'success');
        initAdminFAQs(); // Refresh table
    } catch (error) {
        console.error('Error bookmarking FAQ:', error);
        showToast('Failed to update bookmark.', 'error');
    }
};`;

app = app.replace(oldBookmarkLogic, newBookmarkLogic);

// 4. Update Remove logic
const oldRemoveLogic = `window.removeFAQ = async function(id) {
    if (!confirm('Are you sure you want to permanently delete this question?')) return;
    
    try {
        await firebase.database().ref('faq_submissions/' + id).remove();
        showToast('Question removed.', 'success');
    } catch (error) {
        console.error('Error removing FAQ:', error);
        showToast('Failed to remove question.', 'error');
    }
};`;

const newRemoveLogic = `window.removeFAQ = async function(id) {
    if (!confirm('Are you sure you want to permanently delete this question?')) return;
    
    try {
        const response = await fetch('/api/admin/faqs/' + id, {
            method: 'DELETE'
        });
        if (!response.ok) throw new Error('Delete failed');
        showToast('Question removed.', 'success');
        initAdminFAQs(); // Refresh table
    } catch (error) {
        console.error('Error removing FAQ:', error);
        showToast('Failed to remove question.', 'error');
    }
};`;

app = app.replace(oldRemoveLogic, newRemoveLogic);

fs.writeFileSync('public/app.js', app, 'utf8');
console.log('app.js patched to use API for FAQs');
