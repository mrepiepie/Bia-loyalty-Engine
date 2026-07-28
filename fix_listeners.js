const fs = require('fs');
let app = fs.readFileSync('public/app.js', 'utf8');

app = app.replace(
    /if \(closeBtn\) closeBtn\.addEventListener\('click', closeStudentDetailModal\);/g, 
    "if (closeBtn) closeBtn.addEventListener('click', window.closeStudentDetailModal);"
);
app = app.replace(
    /if \(closeActionBtn\) closeActionBtn\.addEventListener\('click', closeStudentDetailModal\);/g, 
    "if (closeActionBtn) closeActionBtn.addEventListener('click', window.closeStudentDetailModal);"
);

fs.writeFileSync('public/app.js', app);
console.log('Fixed app.js listeners');
