import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, CheckSquare, Repeat, Timer, Wallet, BarChart3, Settings, LogOut, Sun, Moon, BookOpen, Menu, X } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { auth, db } from '../lib/firebase';
import { motion } from 'framer-motion';
import { doc, updateDoc } from 'firebase/firestore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const toggleTheme = async () => {
    if (!profile) return;
    const newTheme = profile.theme === 'light' ? 'dark' : 'light';
    await updateDoc(doc(db, 'users', profile.uid), { theme: newTheme });
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/journal', icon: BookOpen, label: 'Journal' },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/habits', icon: Repeat, label: 'Habits' },
    { to: '/focus', icon: Timer, label: 'Focus' },
    { to: '/budget', icon: Wallet, label: 'Budget' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="flex h-screen h-[100dvh] bg-slate-200 dark:bg-[#18191A] text-slate-900 dark:text-gray-100 transition-colors duration-300 overflow-hidden relative">
      
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-300 dark:border-[#3E4042] flex flex-col p-6 gap-8 bg-white dark:bg-[#242526] transform transition-transform duration-300 lg:relative lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal rounded-lg flex items-center justify-center text-white shadow-sm">
              <Timer size={24} />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Ollie<span className="text-teal text-opacity-80">Sync</span></h1>
          </div>
          <button className="lg:hidden text-slate-500 hover:text-slate-800 dark:hover:text-gray-200" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
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

        <div className="flex flex-col gap-2 mt-auto">
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

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Mobile Topbar */}
        <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-[#242526] border-b border-slate-300 dark:border-[#3E4042] shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal rounded flex items-center justify-center text-white">
              <Timer size={18} />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Ollie<span className="text-teal text-opacity-80">Sync</span></h1>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-slate-600 dark:text-slate-300">
            <Menu size={24} />
          </button>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="max-w-6xl mx-auto pb-20 lg:pb-0"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
