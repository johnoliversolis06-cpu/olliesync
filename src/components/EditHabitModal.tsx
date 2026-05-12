import React, { useState } from 'react';
import { Habit } from '../types';
import { X, Plus, Minus } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

interface EditHabitModalProps {
  habit: Habit | null;
  onClose: () => void;
}

const EditHabitModal: React.FC<EditHabitModalProps> = ({ habit, onClose }) => {
  if (!habit) return null;

  const [title, setTitle] = useState(habit.title);
  const [notes, setNotes] = useState(habit.notes || '');
  const [habitType, setHabitType] = useState<'positive' | 'negative' | 'both'>(habit.habitType || 'both');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(habit.difficulty || 'medium');
  const [category, setCategory] = useState(habit.category || '');

  const handleSave = async () => {
    if (!title.trim()) return;
    
    await updateDoc(doc(db, 'habits', habit.id), {
      title,
      notes,
      habitType,
      difficulty,
      category
    });
    onClose();
  };

  const toggleType = (type: 'positive' | 'negative') => {
    if (type === 'positive') {
      if (habitType === 'positive') setHabitType('negative');
      else if (habitType === 'negative') setHabitType('both');
      else setHabitType('negative');
    } else {
      if (habitType === 'negative') setHabitType('positive');
      else if (habitType === 'positive') setHabitType('both');
      else setHabitType('positive');
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ scale: 0.95, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.95, y: 20 }}
          className="w-full max-w-lg bg-white dark:bg-[#242526] rounded-xl shadow-lg border border-[#E4E6EB] dark:border-[#3E4042] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-purple p-5 flex items-center justify-between text-white border-b border-purple/20">
            <h2 className="text-xl font-bold">Edit Habit</h2>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-1.5 rounded-lg font-medium bg-white/20 hover:bg-white/30 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-1.5 rounded-lg font-bold bg-white text-purple hover:bg-slate-50 transition-colors shadow-sm">
                Save
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6 flex-1 overflow-y-auto">
            <div className="space-y-2">
              <label className="text-sm font-black uppercase text-slate-500">Title*</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-[#FF9B26] outline-none font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black uppercase text-slate-500">Notes</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes..."
                className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-[#FF9B26] outline-none min-h-[120px] resize-none"
              />
            </div>

            <div className="flex justify-center gap-8 py-4">
              <button 
                onClick={() => toggleType('positive')}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  habitType === 'positive' || habitType === 'both' 
                    ? 'bg-[#FF9B26] text-white shadow-lg' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-2 border-slate-300 dark:border-slate-700'
                }`}>
                  <Plus size={24} />
                </div>
                <span className={`font-bold text-sm ${
                  habitType === 'positive' || habitType === 'both' ? 'text-[#FF9B26]' : 'text-slate-400'
                }`}>Positive</span>
              </button>

              <button 
                onClick={() => toggleType('negative')}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  habitType === 'negative' || habitType === 'both' 
                    ? 'bg-slate-600 text-white shadow-lg' 
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-2 border-slate-300 dark:border-slate-700'
                }`}>
                  <Minus size={24} />
                </div>
                <span className={`font-bold text-sm ${
                  habitType === 'negative' || habitType === 'both' ? 'text-slate-600' : 'text-slate-400'
                }`}>Negative</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-black uppercase text-slate-500">Difficulty</label>
                <select 
                  value={difficulty}
                  onChange={e => setDifficulty(e.target.value as any)}
                  className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold outline-none cursor-pointer"
                >
                  <option value="easy">Easy ⭐</option>
                  <option value="medium">Medium ⭐⭐</option>
                  <option value="hard">Hard ⭐⭐⭐</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-black uppercase text-slate-500">Category Tag</label>
                <input 
                  type="text" 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-[#FF9B26] outline-none font-bold"
                />
              </div>
            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EditHabitModal;
