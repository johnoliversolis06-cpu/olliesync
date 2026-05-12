import fs from 'fs';
import path from 'path';

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
    
    content = content.replace(/border-slate-200/g, 'border-slate-300');
    content = content.replace(/shadow-slate-200\/50/g, 'shadow-slate-300/50');
    content = content.replace(/shadow-slate-300\/40/g, 'shadow-slate-300/50');

    if (file === 'src/components/Layout.tsx') {
      content = content.replace(/bg-slate-100/g, 'bg-[#ebecef]'); // deeper gray than slate-50
      content = content.replace(/bg-slate-50\/50/g, 'bg-[#ebecef]'); 
      content = content.replace(/bg-slate-50/g, 'bg-[#ebecef]'); // Sidebar should be bg-white, but there was a bg-slate-50 on the main perhaps
    }

    fs.writeFileSync(fullPath, content);
  }
});

console.log('Replaced borders.');
