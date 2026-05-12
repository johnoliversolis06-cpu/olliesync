const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/Dashboard.tsx',
  'src/pages/Tasks.tsx',
  'src/pages/Habits.tsx',
  'src/pages/Focus.tsx',
  'src/pages/Budget.tsx',
  'src/pages/Analytics.tsx',
  'src/pages/Settings.tsx',
  'src/pages/Login.tsx',
  'src/components/Layout.tsx',
  'src/components/EditTaskModal.tsx',
  'src/components/EditHabitModal.tsx'
];

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    // Replace shadow-sm with shadow-md
    content = content.replace(/shadow-sm/g, 'shadow-md hover:shadow-lg transition-shadow');
    // For borderline visibility, use border-slate-200 instead of #E4E6EB
    content = content.replace(/border-\[#E4E6EB\]/g, 'border-slate-200');
    // ensure transition-shadow isn't duplicated
    content = content.replace(/ hover:shadow-lg transition-shadow bg/g, ' transition-shadow bg');
    
    fs.writeFileSync(fullPath, content);
  }
});

console.log('Replaced styles.');
