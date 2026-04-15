const fs = require('fs');
const path = 'f:/Aplicativos/kineos/rhythm-makers-lab/src/pages/admin/Festivals.tsx';
const content = fs.readFileSync(path, 'utf8');

const selectRegex = /\.select\(`([^`]+)`\)|\.select\("([^"]+)"\)/g;
let match;
let count = 0;

console.log('--- AUDIT START ---');
while ((match = selectRegex.exec(content)) !== null) {
    const query = match[1] || match[2];
    console.log(`QUERY ${++count}:`);
    console.log(query.trim());
    console.log('-------------------');
}
console.log('--- AUDIT END ---');
