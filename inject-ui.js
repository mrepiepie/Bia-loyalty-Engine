const fs = require('fs');

// 1. Modify community.html
let html = fs.readFileSync('public/community.html', 'utf8');

const customSelectCSS = `
<style>
.custom-dropdown {
    position: relative;
    width: 200px;
    user-select: none;
}
.custom-dropdown-selected {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.1);
    color: #fff;
    padding: 8px 12px;
    border-radius: 6px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    font-size: 0.9rem;
    transition: border-color 0.2s;
}
.custom-dropdown-selected:hover {
    border-color: rgba(255,255,255,0.3);
}
.custom-dropdown-options {
    position: absolute;
    top: calc(100% + 5px);
    left: 0;
    width: 100%;
    background: #111;
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    z-index: 999;
    display: none;
    box-shadow: 0 4px 12px rgba(0,0,0,0.5);
    overflow: hidden;
}
.custom-dropdown-options.show {
    display: block;
}
.custom-dropdown-option {
    padding: 10px 12px;
    color: #ccc;
    cursor: pointer;
    font-size: 0.9rem;
    transition: background 0.2s;
}
.custom-dropdown-option:hover {
    background: #3b82f6;
    color: #fff;
}
</style>
`;
if (!html.includes('.custom-dropdown')) {
    html = html.replace('</head>', customSelectCSS + '</head>');
}

const oldSelectHTML = `<select id="post-category" class="input-field" style="width: 200px; cursor: pointer;">
                            <option value="General">General</option>
                            <option value="Academics">Academics</option>
                            <option value="Internships">Internships</option>
                            <option value="Housing">Housing</option>
                        </select>`;

const newSelectHTML = `
                        <div class="custom-dropdown" id="category-dropdown-container">
                            <div class="custom-dropdown-selected" id="category-dropdown-selected">
                                <span>General</span> <i class="fa-solid fa-chevron-down" style="font-size: 0.75rem; color: #888;"></i>
                            </div>
                            <div class="custom-dropdown-options" id="category-dropdown-options">
                                <div class="custom-dropdown-option" data-value="General">General</div>
                                <div class="custom-dropdown-option" data-value="Academics">Academics</div>
                                <div class="custom-dropdown-option" data-value="Internships">Internships</div>
                                <div class="custom-dropdown-option" data-value="Housing">Housing</div>
                            </div>
                            <input type="hidden" id="post-category" value="General">
                        </div>`;
html = html.replace(oldSelectHTML, newSelectHTML);

const oldImageHTML = `<label style="display: flex; align-items: center; gap: 0.5rem; color: #888; cursor: pointer; border: 1px solid rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px;">
                            <i class="fa-solid fa-image"></i>
                            <span id="post-image-label" style="font-size: 0.85rem;">Attach Image</span>
                            <input type="file" id="post-image" accept="image/*" style="display: none;">
                        </label>`;
const newImageHTML = `<div style="display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding-right: 4px;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; color: #888; cursor: pointer; padding: 4px 10px; margin: 0;">
                                <i class="fa-solid fa-image"></i>
                                <span id="post-image-label" style="font-size: 0.85rem;">Attach Image</span>
                                <input type="file" id="post-image" accept="image/*" style="display: none;">
                            </label>
                            <button id="btn-remove-image" style="display: none; background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 4px; border-radius: 4px;" title="Remove Image">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>`;
html = html.replace(oldImageHTML, newImageHTML);
fs.writeFileSync('public/community.html', html);


// 2. Modify community.js
let js = fs.readFileSync('public/community.js', 'utf8');

const dropdownLogic = `
// Custom Dropdown Logic
document.addEventListener('DOMContentLoaded', () => {
    const selected = document.getElementById('category-dropdown-selected');
    const options = document.getElementById('category-dropdown-options');
    const hiddenInput = document.getElementById('post-category');
    
    if (selected && options) {
        selected.addEventListener('click', (e) => {
            options.classList.toggle('show');
            e.stopPropagation();
        });
        
        options.querySelectorAll('.custom-dropdown-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                const val = opt.getAttribute('data-value');
                hiddenInput.value = val;
                selected.querySelector('span').textContent = val;
                options.classList.remove('show');
            });
        });
        
        document.addEventListener('click', () => {
            options.classList.remove('show');
        });
    }

    // Image Remove Logic
    const removeBtn = document.getElementById('btn-remove-image');
    if (removeBtn) {
        removeBtn.addEventListener('click', () => {
            document.getElementById('post-image').value = '';
            document.getElementById('post-image-label').textContent = 'Attach Image';
            removeBtn.style.display = 'none';
        });
    }
});
`;

if (!js.includes('// Custom Dropdown Logic')) {
    js = js + '\n' + dropdownLogic;
}

const oldImageListener = `document.getElementById('post-image').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('post-image-label').textContent = file.name.substring(0, 15) + '...';
    } else {
        document.getElementById('post-image-label').textContent = 'Attach Image';
    }
});`;
const newImageListener = `document.getElementById('post-image').addEventListener('change', (e) => {
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
js = js.replace(oldImageListener, newImageListener);

const oldReset = `            document.getElementById('post-category').value = 'General';
            document.getElementById('post-anonymous').checked = false;
            document.getElementById('post-image').value = '';
            document.getElementById('post-image-label').textContent = 'Attach Image';`;
const newReset = `            document.getElementById('post-category').value = 'General';
            const selectedSpan = document.querySelector('#category-dropdown-selected span');
            if(selectedSpan) selectedSpan.textContent = 'General';
            document.getElementById('post-anonymous').checked = false;
            document.getElementById('post-image').value = '';
            document.getElementById('post-image-label').textContent = 'Attach Image';
            const removeBtn = document.getElementById('btn-remove-image');
            if(removeBtn) removeBtn.style.display = 'none';`;
js = js.replace(oldReset, newReset);

fs.writeFileSync('public/community.js', js);
console.log('UI injected successfully.');
