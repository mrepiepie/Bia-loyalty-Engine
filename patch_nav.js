const fs = require('fs');

let css = fs.readFileSync('public/style.css', 'utf8');

css = css.replace(
    '.nav-links {\r\n    display: flex;\r\n    gap: 0.25rem;\r\n    background: rgba(255, 255, 255, 0.015);\r\n    padding: 0.35rem;\r\n    border-radius: 12px;\r\n    border: 1px solid var(--border-color);\r\n    align-items: center;\r\n}',
    '.nav-links {\n    display: flex;\n    gap: 0.25rem;\n    background: rgba(255, 255, 255, 0.015);\n    padding: 0.35rem;\n    border-radius: 12px;\n    border: 1px solid var(--border-color);\n    align-items: center;\n    overflow-x: auto;\n    scrollbar-width: thin;\n}'
);
// Try without carriage returns just in case
css = css.replace(
    '.nav-links {\n    display: flex;\n    gap: 0.25rem;\n    background: rgba(255, 255, 255, 0.015);\n    padding: 0.35rem;\n    border-radius: 12px;\n    border: 1px solid var(--border-color);\n    align-items: center;\n}',
    '.nav-links {\n    display: flex;\n    gap: 0.25rem;\n    background: rgba(255, 255, 255, 0.015);\n    padding: 0.35rem;\n    border-radius: 12px;\n    border: 1px solid var(--border-color);\n    align-items: center;\n    overflow-x: auto;\n    scrollbar-width: thin;\n}'
);

css = css.replace(
    '.nav-tab {\r\n    background: none;\r\n    border: none;\r\n    color: var(--text-muted);\r\n    padding: 0.5rem 1.25rem;\r\n    border-radius: 8px;\r\n    cursor: pointer;\r\n    font-family: inherit;\r\n    font-weight: 600;\r\n    font-size: 0.85rem;\r\n    display: inline-flex;\r\n    align-items: center;\r\n    gap: 0.5rem;\r\n    transition: all 0.2s ease;\r\n}',
    '.nav-tab {\n    background: none;\n    border: none;\n    color: var(--text-muted);\n    padding: 0.5rem 1.25rem;\n    border-radius: 8px;\n    cursor: pointer;\n    font-family: inherit;\n    font-weight: 600;\n    font-size: 0.85rem;\n    display: inline-flex;\n    align-items: center;\n    gap: 0.5rem;\n    transition: all 0.2s ease;\n    flex-shrink: 0;\n    white-space: nowrap;\n}'
);
// Try without carriage returns just in case
css = css.replace(
    '.nav-tab {\n    background: none;\n    border: none;\n    color: var(--text-muted);\n    padding: 0.5rem 1.25rem;\n    border-radius: 8px;\n    cursor: pointer;\n    font-family: inherit;\n    font-weight: 600;\n    font-size: 0.85rem;\n    display: inline-flex;\n    align-items: center;\n    gap: 0.5rem;\n    transition: all 0.2s ease;\n}',
    '.nav-tab {\n    background: none;\n    border: none;\n    color: var(--text-muted);\n    padding: 0.5rem 1.25rem;\n    border-radius: 8px;\n    cursor: pointer;\n    font-family: inherit;\n    font-weight: 600;\n    font-size: 0.85rem;\n    display: inline-flex;\n    align-items: center;\n    gap: 0.5rem;\n    transition: all 0.2s ease;\n    flex-shrink: 0;\n    white-space: nowrap;\n}'
);

fs.writeFileSync('public/style.css', css, 'utf8');
console.log('CSS fixed');
