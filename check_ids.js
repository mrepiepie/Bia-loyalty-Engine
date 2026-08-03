const fs = require('fs');
const h = fs.readFileSync('public/index.html', 'utf8');
const ids = [
    'login-overlay', 'btn-show-login-modal', 'btn-hero-login',
    'btn-close-login-modal', 'login-modal-overlay', 'login-form',
    'link-forgot-password', 'link-back-login', 'recovery-form',
    'btn-recovery-confirm', 'btn-logout', 'dashboard-logo',
    'btn-submit-lead', 'btn-calculate-discount', 'btn-confirm-redemption',
    'create-student-form', 'adjust-points-form', 'admin-settings-form',
    'bia-undo-btn', 'btn-new-post', 'btn-submit-post', 'btn-cancel-post'
];
ids.forEach(id => {
    if (!h.includes('id="' + id + '"')) {
        console.log('Missing: ' + id);
    }
});
console.log('Check complete.');
