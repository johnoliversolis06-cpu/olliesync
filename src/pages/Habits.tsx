import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { useTimer } from '../lib/TimerContext';
import { Habit, Log } from '../types';
import { Plus, Flame, Sparkles, Trash2, Check, Settings2, X, Search, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PREDEFINED_ROUTINES } from '../constants/routines';
import EditHabitModal from '../components/EditHabitModal';

const HabitsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { setSelectedEntity, setIsActive } = useTimer();
  const [habits, setHabits] = useState<Habit[]>([]);
  
  const [logs, setLogs] = useState<Log[]>([]);
  const [sortBy, setSortBy] = useState<'smart' | 'newest' | 'oldest'>('smart');

  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [isAddingMode, setIsAddingMode] = useState(false);
  
  // Add Habit State
  const [newHabitTitle, setNewHabitTitle] = useState('');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(PREDEFINED_ROUTINES[0].category);

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
    if (habits.some(h => h.title.toLowerCase() === title.toLowerCase())) return;

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
    setIsAddingMode(false);
  };

  const deleteHabit = async (id: string) => {
    await deleteDoc(doc(db, 'habits', id));
  };

  const filteredLibrary = PREDEFINED_ROUTINES.find(c => c.category === selectedCategory)?.habits.filter(h => 
    h.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const sortedHabits = [...habits].sort((a, b) => {
    const isCompletedA = logs.some(l => l.entityId === a.id && l.date === todayStr);
    const isCompletedB = logs.some(l => l.entityId === b.id && l.date === todayStr);
    
    if (sortBy === 'smart') {
      if (isCompletedA !== isCompletedB) {
        return isCompletedA ? 1 : -1; // Uncompleted first
      }
      return a.title.localeCompare(b.title); // Alphabetical
    }
    
    const timeA = a.createdAt?.toMillis?.() || 0;
    const timeB = b.createdAt?.toMillis?.() || 0;
    return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
  });

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight">My Habits</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Build consistency and track your daily routines.</p>
        </div>
        <button 
          onClick={() => setIsAddingMode(true)}
          className="flex items-center gap-2 bg-purple text-white px-6 py-3 rounded-xl font-bold hover:bg-purple/90 transition-all shadow-md active:scale-95"
        >
          <Plus size={20} /> Add Habit
        </button>
      </header>

      {/* Main Habits List */}
      <div className="w-full">
        <div className="flex items-center justify-between px-2 mb-6">
          <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
            Current Stack
            <span className="text-sm bg-teal/10 text-teal px-2 py-0.5 rounded-lg">{habits.length}</span>
          </h3>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-white dark:bg-[#242526] outline-none font-bold text-sm p-2 text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-[#3E4042] cursor-pointer"
          >
            <option value="smart">Smart Sort</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {sortedHabits.map(habit => {
              const isCompletedToday = logs.some(l => l.entityId === habit.id && l.date === todayStr);
              const habitLogs = logs.filter(l => l.entityId === habit.id);

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={habit.id}
                  className={`bg-white dark:bg-[#242526] p-6 rounded-2xl shadow-sm border transition-all cursor-pointer group ${
                    isCompletedToday ? 'border-teal/50 bg-teal/5' : 'border-slate-300 dark:border-[#3E4042] hover:border-purple/30'
                  }`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button')) return;
                    setEditingHabit(habit);
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleToday(habit.id); }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                          isCompletedToday 
                            ? 'bg-teal text-white scale-110' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:bg-slate-200 hover:scale-105 border border-slate-200 dark:border-[#3E4042]'
                        }`}
                      >
                        <Check size={20} className={isCompletedToday ? 'opacity-100' : 'opacity-0'} />
                      </button>
                      <div>
                        <h4 className={`font-bold text-xl leading-tight transition-all ${isCompletedToday ? 'text-teal' : 'text-slate-800 dark:text-gray-100'}`}>
                          {habit.title}
                        </h4>
                        <div className="flex items-center gap-2 mt-1">
                          <Flame size={14} className={getStreak(habit.id) > 0 ? 'text-orange' : 'text-slate-400'} />
                          <span className="text-xs font-black uppercase text-slate-500">Streak: {getStreak(habit.id)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          navigate('/focus', { state: { selectedEntity: `habit:${habit.id}` } });
                        }}
                        title="Start Timer"
                        className="p-2 text-slate-400 hover:text-teal hover:bg-teal/10 rounded-lg transition-all"
                      >
                        <Play size={18} />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingHabit(habit); }}
                        className="p-2 text-slate-400 hover:text-purple hover:bg-purple/10 rounded-lg transition-all"
                      >
                        <Settings2 size={18} />
                      </button>
                    </div>
                  </div>

                  {(habit.habitType || habit.difficulty) && (
                    <div className="flex items-center gap-2 mb-6 pl-[56px]">
                      {habit.habitType && habit.habitType !== 'both' && (
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg ${
                          habit.habitType === 'positive' ? 'bg-[#FF9B26]/10 text-[#FF9B26]' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                        }`}>
                          {habit.habitType}
                        </span>
                      )}
                      {habit.difficulty && <span className="text-[10px] font-bold text-slate-500 capitalize bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-[#3E4042]">{habit.difficulty}</span>}
                    </div>
                  )}

                  {/* Heatmap (Last 14 Days) */}
                  <div className="flex gap-1.5 flex-wrap pl-[56px]">
                    {last14Days.map((dateStr) => {
                      const done = habitLogs.some(l => l.date === dateStr);
                      return (
                        <div 
                          key={dateStr}
                          title={dateStr}
                          className={`w-5 h-5 rounded-[4px] transition-all ${
                            done 
                              ? 'bg-teal shadow-[0_0_8px_rgba(20,184,166,0.5)]' 
                              : 'bg-slate-100 dark:bg-[#18191A] border border-slate-200 dark:border-[#3E4042]'
                          }`}
                        />
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
          
        {habits.length === 0 && (
          <div className="h-64 border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-slate-400 bg-white/50 dark:bg-[#242526]/50">
            <Sparkles size={48} className="mb-4 opacity-50 text-purple" />
            <p className="font-bold text-lg text-slate-600 dark:text-slate-300">Your routine is empty.</p>
            <p className="text-sm">Click "Add Habit" to start building your stack.</p>
          </div>
        )}
      </div>
      
      {editingHabit && (
        <EditHabitModal habit={editingHabit} onClose={() => setEditingHabit(null)} />
      )}

      {/* Add Habit Modal */}
      <AnimatePresence>
        {isAddingMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-[#242526] w-full max-w-4xl rounded-3xl shadow-xl flex flex-col md:flex-row overflow-hidden max-h-[90vh]"
            >
              {/* Library Side */}
              <div className="w-full md:w-2/3 bg-slate-50 dark:bg-[#18191A] p-6 md:p-8 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#3E4042]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-2xl tracking-tight text-slate-800 dark:text-gray-100">Recommended Behaviors</h3>
                  <button onClick={() => setIsAddingMode(false)} className="md:hidden p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-[#3E4042] rounded-lg">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto pr-2">
                  <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 sticky top-0 bg-slate-50 dark:bg-[#18191A] z-10 pb-4">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        type="text" 
                        placeholder="Search templates..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-[#242526] rounded-xl border border-slate-200 dark:border-[#3E4042] outline-none focus:border-purple text-sm transition-all shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 overflow-x-auto pb-4 mb-4 scrollbar-hide">
                    {PREDEFINED_ROUTINES.map(cat => (
                      <button
                        key={cat.category}
                        onClick={() => setSelectedCategory(cat.category)}
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                          selectedCategory === cat.category 
                            ? 'bg-purple text-white shadow-md shadow-purple/20' 
                            : 'bg-white dark:bg-[#242526] text-slate-500 border border-slate-200 dark:border-[#3E4042] hover:bg-slate-100 dark:hover:bg-[#3E4042]'
                        }`}
                      >
                        {cat.category}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {filteredLibrary.map(item => {
                      const isAdded = habits.some(h => h.title === item.title);
                      return (
                        <div
                          key={item.title}
                          className={`p-4 rounded-xl border transition-all flex flex-col justify-between gap-3 ${
                            isAdded 
                            ? 'border-teal/50 bg-teal/5 opacity-80' 
                            : 'border-slate-200 dark:border-[#3E4042] hover:border-purple/30 bg-white dark:bg-[#242526]'
                          }`}
                        >
                          <div>
                            <h4 className="font-bold text-[15px] leading-tight text-slate-800 dark:text-gray-100">{item.title}</h4>
                            <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                          </div>
                          <button
                            disabled={isAdded}
                            onClick={() => addHabit(item.title, item.description)}
                            className={`w-full py-2 rounded-lg font-black uppercase text-[10px] tracking-widest transition-all ${
                              isAdded 
                              ? 'bg-teal/20 text-teal' 
                              : 'bg-purple text-white hover:scale-[1.02] active:scale-95 shadow-sm'
                            }`}
                          >
                            {isAdded ? 'Added' : 'Add Pattern'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Custom Side */}
              <div className="w-full md:w-1/3 p-6 md:p-8 flex flex-col bg-white dark:bg-[#242526]">
                <div className="flex justify-end hidden md:flex mb-6">
                  <button onClick={() => setIsAddingMode(false)} className="p-2 text-slate-400 hover:text-coral hover:bg-coral/10 rounded-lg transition-all">
                    <X size={24} />
                  </button>
                </div>
                
                <div className="flex-1">
                  <div className="w-12 h-12 bg-purple/10 text-purple rounded-2xl flex items-center justify-center mb-6">
                    <Plus size={24} />
                  </div>
                  <h3 className="font-black text-2xl mb-2 text-slate-800 dark:text-gray-100">Custom Habit</h3>
                  <p className="text-sm text-slate-500 mb-8">Create a unique routine tailored to your specific goals.</p>

                  <form onSubmit={(e) => { e.preventDefault(); addHabit(newHabitTitle); }} className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Habit Name</label>
                      <input 
                        type="text" 
                        value={newHabitTitle}
                        onChange={(e) => setNewHabitTitle(e.target.value)}
                        placeholder="e.g., Drink Water"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-[#18191A] border border-slate-200 dark:border-[#3E4042] rounded-xl outline-none focus:border-purple font-medium transition-all"
                      />
                    </div>
                    
                    <button 
                      disabled={!newHabitTitle.trim()} 
                      type="submit" 
                      className="w-full bg-slate-800 dark:bg-gray-200 text-white dark:text-slate-800 px-6 py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-md"
                    >
                      Create Habit
                    </button>
                  </form>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HabitsPage;

