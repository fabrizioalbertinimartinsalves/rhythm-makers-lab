const fs = require('fs');
const path = 'f:\\Aplicativos\\kineos\\rhythm-makers-lab\\src\\pages\\admin\\Festivals.tsx';
let content = fs.readFileSync(path, 'utf8');

// The specific block in ParticipantManagement
const oldBlock = '   if (isLoading) return <Skeleton className="h-64 rounded-[2rem]" />;\n\n   return (';
const newBlock = '   if (isLoadingEnrollments) return <Skeleton className="h-64 rounded-[2rem]" />;\n\n   return (';

// Check if it's there
if (content.indexOf(oldBlock) === -1) {
    console.log("Old block not found with standard spacing. Trying fuzzy match or regex.");
    content = content.replace(/if \(isLoading\) return <Skeleton className="h-64 rounded-\[2rem\]" \/>;\s+return \(/, 'if (isLoadingEnrollments) return <Skeleton className="h-64 rounded-[2rem]" />;\n\n   return (');
} else {
    content = content.replace(oldBlock, newBlock);
}

fs.writeFileSync(path, content);
console.log("File updated successfully.");
