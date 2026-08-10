const fs = require('fs');
let html = fs.readFileSync('public/community.html', 'utf8');

// 1. Replace the native select with custom dropdown
const selectRegex = /<select id="post-category"[\s\S]*?<\/select>/;
const newSelect = `
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
html = html.replace(selectRegex, newSelect);

// 2. Replace the attach image label with one that has a remove button
const imageRegex = /<label[\s\S]*?id="post-image-label"[\s\S]*?<\/label>/;
const newImage = `<div style="display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding-right: 4px;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; color: #888; cursor: pointer; padding: 4px 10px; margin: 0;">
                                <i class="fa-solid fa-image"></i>
                                <span id="post-image-label" style="font-size: 0.85rem;">Attach Image</span>
                                <input type="file" id="post-image" accept="image/*" style="display: none;">
                            </label>
                            <button id="btn-remove-image" style="display: none; background: transparent; border: none; color: #ef4444; cursor: pointer; padding: 4px; border-radius: 4px;" title="Remove Image">
                                <i class="fa-solid fa-xmark"></i>
                            </button>
                        </div>`;
html = html.replace(imageRegex, newImage);

fs.writeFileSync('public/community.html', html);
console.log('HTML injected successfully.');
