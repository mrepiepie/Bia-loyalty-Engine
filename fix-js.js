const fs = require('fs');

let js = fs.readFileSync('public/community.js', 'utf8');

// Replace the change listener on post-image
const oldListener = `document.getElementById('post-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('post-image-label').textContent = file.name.substring(0, 15) + '...';
    } else {
        document.getElementById('post-image-label').textContent = 'Attach Image';
    }
});`;

const newListener = `document.getElementById('post-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    const removeBtn = document.getElementById('btn-remove-image');
    if (file) {
        document.getElementById('post-image-label').textContent = file.name.substring(0, 15) + '...';
        if(removeBtn) removeBtn.style.display = 'block';
    } else {
        document.getElementById('post-image-label').textContent = 'Attach Image';
        if(removeBtn) removeBtn.style.display = 'none';
    }
});`;

js = js.replace(oldListener, newListener);

// Replace the reset logic in the successful submit post block
// We can use a regex to find the reset block
const resetRegex = /document\.getElementById\('post-category'\)\.value = 'General';\s*document\.getElementById\('post-anonymous'\)\.checked = false;\s*document\.getElementById\('post-image'\)\.value = '';\s*document\.getElementById\('post-image-label'\)\.textContent = 'Attach Image';/;

const newReset = `document.getElementById('post-category').value = 'General';
            const selectedSpan = document.querySelector('#category-dropdown-selected span');
            if(selectedSpan) selectedSpan.textContent = 'General';
            document.getElementById('post-anonymous').checked = false;
            document.getElementById('post-image').value = '';
            document.getElementById('post-image-label').textContent = 'Attach Image';
            const removeBtn = document.getElementById('btn-remove-image');
            if(removeBtn) removeBtn.style.display = 'none';`;

js = js.replace(resetRegex, newReset);

// also cache bust the version parameter in html just in case
let html = fs.readFileSync('public/community.html', 'utf8');
html = html.replace(/src="community\.js\?v=\d+"/g, 'src="community.js?v=' + Date.now() + '"');
fs.writeFileSync('public/community.html', html);

fs.writeFileSync('public/community.js', js);
console.log('Fixed community.js');
