const fs = require('fs');
let app = fs.readFileSync('public/app.js', 'utf8');

let append = `
window.filterPromoHistory = function(query, listId) {
    const list = document.getElementById(listId);
    if (!list) return;
    
    const rows = list.querySelectorAll('tr');
    const lowerQuery = query.toLowerCase().trim();
    
    let visibleCount = 0;
    rows.forEach(row => {
        if (row.cells.length === 1) return; // skip "Loading" or "No codes" messages
        const text = row.textContent.toLowerCase();
        if (text.includes(lowerQuery)) {
            row.style.display = '';
            visibleCount++;
        } else {
            row.style.display = 'none';
        }
    });
    
    // Manage empty state if no rows match
    const existingEmptyRow = list.querySelector('.empty-search-row');
    if (existingEmptyRow) existingEmptyRow.remove();
    
    if (visibleCount === 0 && rows.length > 0 && rows[0].cells.length > 1) {
        const emptyRow = document.createElement('tr');
        emptyRow.className = 'empty-search-row';
        emptyRow.innerHTML = \`<td colspan="3" style="text-align: center; color: rgba(255,255,255,0.4); padding: 1rem 0;">No matching codes found.</td>\`;
        list.appendChild(emptyRow);
    }
};
`;

if (!app.includes('window.filterPromoHistory')) {
    app += append;
    fs.writeFileSync('public/app.js', app, 'utf8');
}
