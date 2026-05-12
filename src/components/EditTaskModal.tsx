import React, { useState } from 'react';
import { Task } from '../types';
import { X } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

interface EditTaskModalProps {
  task: Task | null;
  onClose: () => void;
}

const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onClose }) => {
  if (!task) return null;

  const [title, setTitle] = useState(task.title);
  const [notes, setNotes] = useState(task.notes || '');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(task.difficulty || 'medium');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'anytime'>(task.timeOfDay || 'anytime');
  const [category, setCategory] = useState(task.category || '');

  const handleSave = async () => {
    if (!title.trim()) return;
    
    await updateDoc(doc(db, 'tasks', task.id), {
      title,
      notes,
      difficulty,
      timeOfDay,
      category
    });
    onClose();
  };

  const handleDelete = async () => {
    // Delete is handled from the main view, but we could add it here
    onClose();
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
          <div className="bg-teal p-5 flex items-center justify-between text-white border-b border-teal/20">
            <h2 className="text-xl font-bold">Edit Task</h2>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-1.5 rounded-lg font-medium bg-white/20 hover:bg-white/30 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} className="px-4 py-1.5 rounded-lg font-bold bg-white text-teal hover:bg-slate-50 transition-colors shadow-sm">
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
                className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-[#24C6DC] outline-none font-bold"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-black uppercase text-slate-500">Notes</label>
              <textarea 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                placeholder="Add notes..."
                className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-[#24C6DC] outline-none min-h-[120px] resize-none"
              />
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
                <label className="text-sm font-black uppercase text-slate-500">Time of Day</label>
                <select 
                  value={timeOfDay}
                  onChange={e => setTimeOfDay(e.target.value as any)}
                  className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold outline-none cursor-pointer"
                >
                  <option value="anytime">Anytime</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                </select>
              </div>
            </div>
            
            <div className="space-y-2">
                <label className="text-sm font-black uppercase text-slate-500">Subfolder / Group</label>
                <input 
                  type="text" 
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  placeholder="e.g. Work, Errands, Chores"
                  className="w-full p-4 rounded-xl bg-slate-100 dark:bg-slate-800 border-2 border-transparent focus:border-[#24C6DC] outline-none font-bold"
                />
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EditTaskModal;
