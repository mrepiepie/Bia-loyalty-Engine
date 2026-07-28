const fs = require('fs');
let appJs = fs.readFileSync('public/app.js', 'utf8');

// 1. Remove the fake hook (just replace with empty string if it exists)
const hookRegex = /\/\/ Hook into existing initAdminDashboard[\s\S]*?\}, 1000\);\r?\n\}/;
appJs = appJs.replace(hookRegex, '');

// 2. Add to tab click handler
appJs = appJs.replace(
    /if \(target === 'overview'\) loadStudentAnnouncements\(\);\r?\n\s+\}\);\r?\n\}\);/,
    "if (target === 'overview') loadStudentAnnouncements();\n          if (target === 'admin-faqs') initAdminFAQs();\n      });\n});"
);

// 3. Add to showPortalDashboard
appJs = appJs.replace(
    /loadAdminStudents\(\);\r?\n\s+\} else \{/,
    "loadAdminStudents();\n        initAdminFAQs();\n    } else {"
);

fs.writeFileSync('public/app.js', appJs, 'utf8');
console.log('Successfully patched initAdminFAQs calls with Regex!');
