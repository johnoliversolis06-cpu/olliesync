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
    
    // Replace light mode borders
    content = content.replace(/border-slate-200/g, 'border-slate-300');
    
    // Default shadows are fine, but shadow-slate-200/50 is too light.
    // Let's remove the color tint and just rely on default shadow-md (which is black with opacity)
    content = content.replace(/shadow-slate-200\/50/g, 'shadow-slate-300/50');
    content = content.replace(/shadow-slate-300\/40/g, 'shadow-slate-300/50');

    // Make main background more distinct from white cards
    // Layout.tsx sets the main background
    if (file === 'src/components/Layout.tsx') {
      content = content.replace(/bg-slate-100/g, 'bg-[#F2F4F7]'); // slightly deeper gray for contrast
    }

    fs.writeFileSync(fullPath, content);
  }
});

console.log('Replaced borders.');
