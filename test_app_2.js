const fs = require('fs');
const js = fs.readFileSync('public/app.js', 'utf8');

global.window = {
    addEventListener: (e, cb) => {
        if (e === 'load') global.onload_cb = cb;
    },
    gsap: { to: () => {}, fromTo: () => {}, from: () => {} },
    location: { href: '', hash: '' },
    open: () => {},
    SplitText: {}
};
global.document = {
    addEventListener: () => {}, // Added this mock
    getElementById: () => ({ 
        addEventListener: () => {}, 
        style: {}, 
        classList: { add: ()=>{}, remove: ()=>{} },
        remove: () => {},
        innerText: '',
        cloneNode: () => ({ addEventListener: () => {} }),
        parentNode: { replaceChild: () => {} }
    }),
    querySelector: () => ({ 
        style: {}, 
        classList: { add: ()=>{}, remove: ()=>{} },
        addEventListener: () => {},
        innerText: ''
    }),
    querySelectorAll: () => ([]),
    documentElement: { lang: '' },
    body: { classList: { add: ()=>{}, remove: ()=>{} }, style: {} },
    createElement: () => ({ style: {}, classList: { add: ()=>{}, remove: ()=>{} } })
};
global.localStorage = {
    getItem: () => null,
    setItem: () => {}
};
global.navigator = { clipboard: { writeText: async () => {} } };
global.MutationObserver = class {
    observe() {}
    disconnect() {}
};
global.gsap = global.window.gsap;

try {
    eval(js);
    console.log("APP.JS COMPILED.");
    if (global.onload_cb) {
        global.onload_cb();
        console.log("Window load event fired!");
    }
} catch (e) {
    console.log("APP.JS THREW ERROR:", e);
}
