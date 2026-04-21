const fs = require('fs');
const parser = require('@babel/parser');
const code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

const tabs = ['resumen', 'kpis', 'tareas', 'acciones', 'proximamente'];

for (let tab of tabs) {
    let startStr = `healthTab === '${tab}' && (`;
    let startIdx = code.indexOf(startStr);
    if(startIdx === -1) continue;
    
    let endIdx = -1;
    let nextIndex = tabs.indexOf(tab) + 1;
    if (nextIndex < tabs.length) {
        let nextSearch = `healthTab === '${tabs[nextIndex]}' && (`;
        endIdx = code.indexOf(nextSearch, startIdx);
    } else {
        endIdx = code.indexOf('</>', startIdx);
    }
    
    let block = code.substring(startIdx + startStr.length, endIdx !== -1 ? endIdx : undefined);
    
    // Evaluate just this block
    let testCode = `const App = () => { return ${block.trim()} };`;
    try {
        parser.parse(testCode, { sourceType: 'module', plugins: ['jsx'] });
        console.log(`Tab ${tab}: PARSED SUCCESSFULLY`);
    } catch(e) {
        console.log(`Tab ${tab}: ERROR - ${e.message}`);
    }
}
