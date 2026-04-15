const fs = require('fs');
const path = 'f:\\Aplicativos\\kineos\\rhythm-makers-lab\\src\\pages\\admin\\Festivals.tsx';
let content = fs.readFileSync(path, 'utf8');

const oldProps = `function ChoreographyManagement({
   festivalId,
   studioId,
   enrollments
}: {
   festivalId: string,
   studioId: string,
   enrollments: any[]
}) {`;

const newProps = `function ChoreographyManagement({
   festivalId,
   studioId,
   enrollments,
   isLoadingEnrollments
}: {
   festivalId: string,
   studioId: string,
   enrollments: any[],
   isLoadingEnrollments: boolean
}) {`;

if (content.includes(oldProps)) {
    content = content.replace(oldProps, newProps);
    fs.writeFileSync(path, content);
    console.log("Successfully updated ChoreographyManagement props! ✅");
} else {
    console.error("Could not find the exact string to replace. Checking if it's already updated...");
    if (content.includes("isLoadingEnrollments: boolean")) {
        console.log("Looks like it might be updated already?");
    }
}
