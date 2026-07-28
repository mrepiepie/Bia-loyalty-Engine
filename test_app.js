const fs = require('fs');
const js = fs.readFileSync('public/app.js', 'utf8');

// Mock browser environment
const window = {
    addEventListener: () => {},
    gsap: { to: () => {}, fromTo: () => {} },
    location: { href: '', hash: '' },
    open: () => {}
};
const document = {
    getElementById: () => ({ addEventListener: () => {}, style: {}, classList: { add: ()=>{}, remove: ()=>{} } }),
    querySelector: () => ({ style: {}, classList: { add: ()=>{}, remove: ()=>{} } }),
    querySelectorAll: () => ([]),
    documentElement: { lang: '' },
    body: { classList: { add: ()=>{}, remove: ()=>{} }, style: {} },
    createElement: () => ({ style: {}, classList: { add: ()=>{}, remove: ()=>{} } })
};
const localStorage = {
    getItem: () => null,
    setItem: () => {}
};
const navigator = { clipboard: { writeText: async () => {} } };

try {
    eval(js);
    console.log("APP.JS EXECUTED WITHOUT TOP-LEVEL ERRORS");
} catch (e) {
    console.log("APP.JS THREW ERROR:", e);
}
