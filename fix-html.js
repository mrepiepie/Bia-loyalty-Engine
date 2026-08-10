const fs = require('fs');

let html = fs.readFileSync('public/community.html', 'utf8');

// I need to add back the Post Anonymously label between the custom dropdown and the attach image block.
const toFind = `<div style="display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding-right: 4px;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; color: #888; cursor: pointer; padding: 4px 10px; margin: 0;">
                                <i class="fa-solid fa-image"></i>
                                <span id="post-image-label" style="font-size: 0.85rem;">Attach Image</span>
                                <input type="file" id="post-image" accept="image/*" style="display: none;">
                            </label>`;

const toReplace = `
                        <label style="display: flex; align-items: center; gap: 0.5rem; color: #888; cursor: pointer;">
                            <input type="checkbox" id="post-anonymous"> Post Anonymously
                        </label>
                        <div style="display: flex; align-items: center; gap: 0.5rem; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding-right: 4px;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; color: #888; cursor: pointer; padding: 4px 10px; margin: 0;">
                                <i class="fa-solid fa-image"></i>
                                <span id="post-image-label" style="font-size: 0.85rem;">Attach Image</span>
                                <input type="file" id="post-image" accept="image/*" style="display: none;">
                            </label>`;

html = html.replace(toFind, toReplace);

// Let's add a version query parameter to community.js and app.js to break cache
html = html.replace('src="community.js"', 'src="community.js?v=' + Date.now() + '"');

fs.writeFileSync('public/community.html', html);
console.log('Fixed community.html');
