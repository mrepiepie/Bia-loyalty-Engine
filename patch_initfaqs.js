const fs = require('fs');
let appJs = fs.readFileSync('public/app.js', 'utf8');

// 1. Remove the fake hook
const fakeHook = `// Hook into existing initAdminDashboard
const originalInitAdminDashboard = window.initAdminDashboard;
if (typeof originalInitAdminDashboard === 'function') {
    window.initAdminDashboard = function() {
        originalInitAdminDashboard();
        initAdminFAQs();
    };
} else {
    // If it doesn't exist globally yet, we attach an event or wait for it
    setTimeout(() => {
        if (typeof window.initAdminDashboard === 'function') {
            const oldInit = window.initAdminDashboard;
            window.initAdminDashboard = function() {
                oldInit();
                initAdminFAQs();
            };
        }
    }, 1000);
}`;
appJs = appJs.replace(fakeHook, '');

// 2. Add to tab click handler
const oldTabClick = `          if (target === 'overview') loadStudentAnnouncements();
      });
  });`;
const newTabClick = `          if (target === 'overview') loadStudentAnnouncements();
          if (target === 'admin-faqs') initAdminFAQs();
      });
  });`;
appJs = appJs.replace(oldTabClick, newTabClick);

// 3. Add to showPortalDashboard
const oldShowPortal = `        const content = document.getElementById('admin-students');
        if (content) {
            content.style.display = 'block';
            content.classList.add('active');
        }

        loadAdminStudents();
    } else {`;
const newShowPortal = `        const content = document.getElementById('admin-students');
        if (content) {
            content.style.display = 'block';
            content.classList.add('active');
        }

        loadAdminStudents();
        initAdminFAQs();
    } else {`;
appJs = appJs.replace(oldShowPortal, newShowPortal);

// Ensure it didn't fail
if (appJs.includes(`if (target === 'admin-faqs') initAdminFAQs();`) && appJs.includes(`initAdminFAQs();\r\n    } else {` || appJs.includes(`initAdminFAQs();\n    } else {`))) {
    fs.writeFileSync('public/app.js', appJs, 'utf8');
    console.log('Successfully patched initAdminFAQs calls!');
} else {
    console.log('Failed to patch initAdminFAQs calls! Some replacements failed.');
}
