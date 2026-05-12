import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Repeat, Timer, Wallet, BarChart3, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { auth, db } from '../lib/firebase';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile } = useAuth();

  const toggleTheme = async () => {
    if (!profile) return;
    const newTheme = profile.theme === 'light' ? 'dark' : 'light';
    await updateDoc(doc(db, 'users', profile.uid), { theme: newTheme });
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/habits', icon: Repeat, label: 'Habits' },
    { to: '/focus', icon: Timer, label: 'Focus' },
    { to: '/budget', icon: Wallet, label: 'Budget' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex bg-slate-200 dark:bg-[#18191A] text-slate-900 dark:text-gray-100 min-h-screen transition-colors duration-300">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-300 dark:border-[#3E4042] flex flex-col p-6 gap-8 bg-white dark:bg-[#242526]">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-teal rounded-lg flex items-center justify-center text-white shadow-sm">
            <Timer size={24} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Ollie<span className="text-teal text-opacity-80">Sync</span></h1>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive 
                    ? 'bg-teal/10 text-teal dark:bg-teal/10 font-bold' 
                    : 'hover:bg-slate-200 dark:hover:bg-[#3E4042] text-slate-500 dark:text-slate-400'
                }`
              }
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-4">
          <button 
            onClick={toggleTheme}
            className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium hover:bg-slate-200 dark:hover:bg-[#3E4042] text-slate-500 dark:text-slate-400 transition-all group"
          >
            <div className="w-8 h-8 rounded-md bg-white dark:bg-[#18191A] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              {profile?.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </div>
            {profile?.theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
          <button 
            onClick={() => auth.signOut()}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-coral hover:bg-coral/10 transition-all"
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-200 dark:bg-[#18191A] p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4 }}
          className="max-w-6xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
};

export default Layout;
