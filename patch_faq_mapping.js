const fs = require('fs');
let app = fs.readFileSync('public/app.js', 'utf8');

// Replace studentName and studentId in initAdminFAQs
app = app.replace(
    /escapeHTML\(sub\.studentName\)/g,
    "escapeHTML(sub.student_name || sub.studentName || 'Unknown')"
);
app = app.replace(
    /escapeHTML\(sub\.studentId\)/g,
    "escapeHTML(sub.student_id || sub.studentId || 'N/A')"
);

fs.writeFileSync('public/app.js', app, 'utf8');
console.log('Fixed snake_case mapping in app.js');
