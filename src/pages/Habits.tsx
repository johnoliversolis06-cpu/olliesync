import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { Habit, Log } from '../types';
import { Plus, Flame, Calendar as CalIcon, Repeat, Sparkles, ChevronRight, Trash2, Search, Check, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PREDEFINED_ROUTINES } from '../constants/routines';
import EditHabitModal from '../components/EditHabitModal';

const HabitsPage: React.FC = () => {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(PREDEFINED_ROUTINES[0].category);
  const [logs, setLogs] = useState<Log[]>([]);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);

  useEffect(() => {
    if (!user) return;
    const qHabits = query(collection(db, 'habits'), where('userId', '==', user.uid), where('archived', '==', false));
    const unsubscribeHabits = onSnapshot(qHabits, (snap) => {
      setHabits(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit)));
    });

    const qLogs = query(collection(db, 'logs'), where('userId', '==', user.uid), where('type', '==', 'habit'));
    const unsubscribeLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Log)));
    });

    return () => {
      unsubscribeHabits();
      unsubscribeLogs();
    };
  }, [user]);

  const todayDate = new Date();
  const last14Days = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(todayDate);
    d.setDate(todayDate.getDate() - (13 - i));
    return d.toISOString().split('T')[0];
  });
  const todayStr = last14Days[13];

  const toggleToday = async (habitId: string) => {
    const isCompleted = logs.some(l => l.entityId === habitId && l.date === todayStr);
    if (isCompleted) {
      const log = logs.find(l => l.entityId === habitId && l.date === todayStr);
      if (log) await deleteDoc(doc(db, 'logs', log.id));
    } else {
      await addDoc(collection(db, 'logs'), {
        userId: user!.uid,
        entityId: habitId,
        type: 'habit',
        date: todayStr,
        timeSpent: 0,
        completed: true,
        timestamp: serverTimestamp()
      });
    }
  };

  const getStreak = (habitId: string) => {
    const habitLogs = logs.filter(l => l.entityId === habitId);
    let streak = 0;
    for (let i = 13; i >= 0; i--) {
      if (habitLogs.some(l => l.date === last14Days[i])) {
        streak++;
      } else if (i === 13) {
        continue; 
      } else {
        break;
      }
    }
    return streak;
  };

  const addHabit = async (title: string, desc: string = '') => {
    if (!user || !title.trim()) return;
    
    // Check for duplicates
    if (habits.some(h => h.title.toLowerCase() === title.toLowerCase())) {
      return;
    }

    await addDoc(collection(db, 'habits'), {
      userId: user.uid,
      title,
      frequency: frequency,
      description: desc,
      category: selectedCategory,
      archived: false,
      habitType: 'both',
      difficulty: 'medium',
      createdAt: serverTimestamp()
    });
    setNewHabitTitle('');
  };

  const deleteHabit = async (id: string) => {
    await deleteDoc(doc(db, 'habits', id));
  };

  const filteredLibrary = PREDEFINED_ROUTINES.find(c => c.category === selectedCategory)?.habits.filter(h => 
    h.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight">Identity Library</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Quick-add high-impact routines to your life.</p>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        {/* Library Section */}
        <div className="xl:col-span-8 space-y-8">
          
          <div className="bg-purple/10 border border-dashed border-purple/30 p-6 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-6 group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple rounded-lg flex items-center justify-center text-white shadow-sm">
                <Plus size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-gray-100">Custom Habit</h3>
                <p className="text-slate-500 font-medium">Build your own routine from scratch.</p>
              </div>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); addHabit(newHabitTitle); }} className="flex w-full md:w-auto gap-2">
              <input 
                type="text" 
                value={newHabitTitle}
                onChange={(e) => setNewHabitTitle(e.target.value)}
                placeholder="Name your habit..."
                className="flex-1 px-4 py-3 bg-white dark:bg-[#242526] border border-slate-300 dark:border-[#3E4042] rounded-lg outline-none focus:border-purple font-medium shadow-md shadow-slate-200/50 dark:shadow-none transition-all"
              />
              <button disabled={!newHabitTitle.trim()} type="submit" className="bg-slate-800 dark:bg-gray-200 text-white dark:text-slate-800 px-6 py-3 rounded-lg font-bold hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-sm">
                Add
              </button>
            </form>
          </div>

          <div className="bg-white dark:bg-[#242526] p-6 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042]">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="Search habits..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-[#18191A] rounded-lg border border-[#E4E6EB] dark:border-[#3E4042] outline-none focus:border-purple font-medium transition-all"
                />
              </div>
              <div className="flex flex-wrap gap-2 pb-2">
                {PREDEFINED_ROUTINES.map(cat => (
                  <button
                    key={cat.category}
                    onClick={() => setSelectedCategory(cat.category)}
                    className={`whitespace-nowrap px-4 py-2 rounded-lg font-medium transition-all ${
                      selectedCategory === cat.category ? 'bg-purple text-white shadow-sm' : 'bg-slate-50 dark:bg-[#18191A] text-slate-500 border border-slate-300 dark:border-[#3E4042] hover:bg-slate-100 dark:hover:bg-[#3E4042]'
                    }`}
                  >
                    {cat.category}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredLibrary.map(item => {
                  const isAdded = habits.some(h => h.title === item.title);
                  return (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={item.title}
                      className={`p-4 rounded-lg border transition-all flex flex-col justify-between gap-3 ${
                        isAdded 
                        ? 'border-teal/50 bg-teal/5 opacity-80' 
                        : 'border-[#E4E6EB] dark:border-[#3E4042] hover:border-purple/30 group bg-slate-50 dark:bg-[#18191A]'
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-lg leading-tight">{item.title}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.description}</p>
                      </div>
                      <button
                        disabled={isAdded}
                        onClick={() => addHabit(item.title, item.description)}
                        className={`w-full py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all ${
                          isAdded 
                          ? 'bg-teal/20 text-teal' 
                          : 'bg-purple text-white hover:scale-[1.02] active:scale-95'
                        }`}
                      >
                        {isAdded ? 'Added to Routine' : 'Add to Life'}
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* My Routine Section */}
        <div className="xl:col-span-4 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
              My Current Stack
              <span className="text-sm bg-teal/10 text-teal px-2 py-0.5 rounded-lg">{habits.length}</span>
            </h3>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-100 dark:bg-slate-800 text-xs font-bold p-2 text-slate-500 rounded-lg outline-none cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {[...habits].sort((a, b) => {
                const timeA = a.createdAt?.toMillis?.() || 0;
                const timeB = b.createdAt?.toMillis?.() || 0;
                return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
              }).map(habit => {
                const isCompletedToday = logs.some(l => l.entityId === habit.id && l.date === todayStr);
                const habitLogs = logs.filter(l => l.entityId === habit.id);

                return (
                  <motion.div
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={habit.id}
                    className={`bg-white dark:bg-[#242526] p-4 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border group transition-all cursor-pointer ${
                      isCompletedToday ? 'border-teal/50' : 'border-slate-300 dark:border-[#3E4042]'
                    }`}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('button')) return;
                      setEditingHabit(habit);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleToday(habit.id); }}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                            isCompletedToday 
                              ? 'bg-teal text-white scale-110' 
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:bg-slate-200 hover:scale-105'
                          }`}
                        >
                          <Check size={16} className={isCompletedToday ? 'opacity-100' : 'opacity-0'} />
                        </button>
                        <div>
                          <h4 className={`font-bold text-lg leading-tight transition-all ${isCompletedToday ? 'text-teal' : ''}`}>
                            {habit.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Flame size={14} className={getStreak(habit.id) > 0 ? 'text-orange' : 'text-slate-300'} />
                            <span className="text-[10px] font-black uppercase text-slate-400">Streak: {getStreak(habit.id)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingHabit(habit); }}
                          className="p-2 text-slate-400 hover:text-purple hover:bg-purple/10 rounded-lg transition-all"
                        >
                          <Settings2 size={16} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }}
                          className="p-2 text-slate-400 hover:text-coral hover:bg-coral/10 rounded-lg transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {(habit.habitType || habit.difficulty) && (
                      <div className="flex items-center gap-2 mb-4 ml-11">
                        {habit.habitType && habit.habitType !== 'both' && (
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                            habit.habitType === 'positive' ? 'bg-[#FF9B26]/10 text-[#FF9B26]' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                          }`}>
                            {habit.habitType}
                          </span>
                        )}
                        {habit.difficulty && <span className="text-[10px] font-bold text-slate-400 capitalize">{habit.difficulty}</span>}
                      </div>
                    )}

                    {/* Heatmap (Last 14 Days) */}
                    <div className="flex gap-1.5 flex-wrap">
                      {last14Days.map((dateStr) => {
                        const done = habitLogs.some(l => l.date === dateStr);
                        return (
                          <div 
                            key={dateStr}
                            title={dateStr}
                            className={`w-4 h-4 rounded-[3px] transition-all ${
                              done 
                                ? 'bg-teal shadow-[0_0_8px_rgba(20,184,166,0.5)]' 
                                : 'bg-slate-100 dark:bg-slate-800'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            
            {habits.length === 0 && (
              <div className="h-48 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-300">
                <Sparkles size={32} className="mb-2 opacity-50" />
                <p className="font-bold px-8 text-center text-sm italic">Routine empty. Select from the library to grow!</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {editingHabit && (
        <EditHabitModal habit={editingHabit} onClose={() => setEditingHabit(null)} />
      )}
    </div>
  );
};

export default HabitsPage;

