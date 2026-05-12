import React from 'react';
import { signInWithGoogle } from '../lib/firebase';
import { motion } from 'framer-motion';
import { Timer, ArrowRight } from 'lucide-react';

const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#18191A] p-6 overflow-hidden relative">
      {/* Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-teal/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-purple/20 rounded-full blur-3xl animate-pulse" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white dark:bg-[#242526] p-10 rounded-xl shadow-lg border border-[#E4E6EB] dark:border-[#3E4042] text-center z-10"
      >
        <div className="w-16 h-16 bg-teal rounded-xl mx-auto flex items-center justify-center text-white mb-8 shadow-sm">
          <Timer size={40} />
        </div>
        
        <h1 className="text-4xl font-bold text-slate-800 dark:text-gray-100 mb-4 tracking-tight leading-tight">
          Welcome to <span className="text-teal">OllieSync</span>
        </h1>
        
        <p className="text-slate-500 dark:text-slate-400 mb-10 text-lg">
          Master your time, habits, and focus.
        </p>
        
        <button
          onClick={signInWithGoogle}
          className="w-full bg-purple text-white flex items-center justify-center gap-3 p-4 rounded-lg font-bold group mt-2 hover:opacity-90 transition-all shadow-sm"
        >
          Sign in with Google
          <ArrowRight className="group-hover:translate-x-1 transition-transform" />
        </button>
      </motion.div>
    </div>
  );
};

export default LoginPage;
