const fs = require('fs');

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
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // Replace shadow-sm with shadow-md
    content = content.replace(/shadow-sm/g, 'shadow-md');
    // For borderline visibility, use border-slate-200 instead of #E4E6EB
    content = content.replace(/border-\[#E4E6EB\]/g, 'border-slate-200');
    content = content.replace(/bg-slate-50\/50/g, 'bg-slate-100');
    // And for Dashboard, make hover shadow larger
    content = content.replace(/shadow-md"/g, 'shadow-md hover:shadow-lg transition-shadow"');
    
    fs.writeFileSync(file, content);
  }
});

console.log('Replaced styles.');
