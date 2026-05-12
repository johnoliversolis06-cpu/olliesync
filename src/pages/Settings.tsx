import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Timer, Globe, Save } from 'lucide-react';
import { motion } from 'framer-motion';

const SettingsPage: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [focusInterval, setFocusInterval] = useState(profile?.focusInterval || 25);
  const [breakInterval, setBreakInterval] = useState(profile?.breakInterval || 5);
  const [autoCutoffDuration, setAutoCutoffDuration] = useState(profile?.autoCutoffDuration || 60);
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        displayName,
        focusInterval: Number(focusInterval),
        breakInterval: Number(breakInterval),
        autoCutoffDuration: Number(autoCutoffDuration)
      });
      await refreshProfile();
      alert("Settings updated!");
    } catch (error) {
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-10">
      <header>
        <h2 className="text-3xl font-black tracking-tight">System Settings</h2>
        <p className="text-slate-500 dark:text-slate-400">Tailor your experience.</p>
      </header>

      <form onSubmit={handleSave} className="space-y-8">
        {/* Profile */}
        <section className="bg-white dark:bg-[#242526] p-8 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] space-y-6">
          <div className="flex items-center gap-3 text-purple uppercase text-xs font-semibold tracking-widest">
            <User size={16} /> Identity
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-500">Display Name</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-4 bg-slate-50 dark:bg-[#18191A] rounded-lg border border-slate-300 dark:border-[#3E4042] font-medium outline-none focus:border-purple transition-all"
            />
          </div>
        </section>

        {/* Intervals */}
        <section className="bg-white dark:bg-[#242526] p-8 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] space-y-6">
          <div className="flex items-center gap-3 text-teal uppercase text-xs font-semibold tracking-widest">
            <Timer size={16} /> Focus Mechanics
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-500">Focus Session (min)</label>
              <input 
                type="number" 
                value={focusInterval}
                onChange={(e) => setFocusInterval(Number(e.target.value))}
                className="w-full p-4 bg-slate-50 dark:bg-[#18191A] rounded-lg border border-slate-300 dark:border-[#3E4042] font-medium outline-none focus:border-teal transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-500">Break Time (min)</label>
              <input 
                type="number" 
                value={breakInterval}
                onChange={(e) => setBreakInterval(Number(e.target.value))}
                className="w-full p-4 bg-slate-50 dark:bg-[#18191A] rounded-lg border border-slate-300 dark:border-[#3E4042] font-medium outline-none focus:border-teal transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-500">Auto Cut-off (min)</label>
              <input 
                type="number" 
                value={autoCutoffDuration}
                onChange={(e) => setAutoCutoffDuration(Number(e.target.value))}
                className="w-full p-4 bg-slate-50 dark:bg-[#18191A] rounded-lg border border-slate-300 dark:border-[#3E4042] font-medium outline-none focus:border-teal transition-all"
              />
            </div>
          </div>
        </section>

        <button 
          type="submit" 
          disabled={saving}
          className="w-full bg-slate-800 dark:bg-gray-200 text-white dark:text-slate-800 py-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 transition-all font-bold shadow-sm"
        >
          <Save size={20} /> {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </form>

      <footer className="text-center py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">OllieSync Engine v1.0.4</p>
      </footer>
    </div>
  );
};

export default SettingsPage;
