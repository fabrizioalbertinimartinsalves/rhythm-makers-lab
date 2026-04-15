import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/pages/admin/Festivals.tsx';
const content = readFileSync(filePath, 'utf8');
const lines = content.split('\n');

console.log(`Total lines: ${lines.length}`);

// Keep only lines 1-3096 (0-indexed: 0-3095)
const truncated = lines.slice(0, 3096).join('\n');

writeFileSync(filePath, truncated, 'utf8');
console.log(`File truncated to ${3096} lines. Duplicates removed.`);
