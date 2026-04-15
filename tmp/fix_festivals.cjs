const fs = require('fs');
const path = 'f:/Aplicativos/kineos/rhythm-makers-lab/src/pages/admin/Festivals.tsx';
let content = fs.readFileSync(path, 'utf8');

// Fix 1: Qualify festival_available_items in all select queries
// Targeted: festival_available_items ( ... ) OR festival_available_items(*)
// But NOT already qualified with !item_id
content = content.replace(/festival_available_items\s*\((?!item_id)/g, 'festival_available_items!item_id (');
content = content.replace(/festival_available_items\*/g, 'festival_available_items!item_id*');

// Fix 2: Ensure any remaining festival_package_inclusions are qualified
content = content.replace(/festival_package_inclusions\s*\((?!package_id)/g, 'festival_package_inclusions!package_id (');

fs.writeFileSync(path, content);
console.log('Festivals.tsx hardened successfully.');
