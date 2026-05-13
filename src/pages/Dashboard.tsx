import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc,  orderBy, limit } from 'firebase/firestore';
import { Task, Habit } from '../types';
import { generateQuote } from '../services/gemini';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, Play, Circle, Flame, Sparkles, Plus, Activity } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [quote, setQuote] = useState<{ text: string, author: string } | null>(null);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [stats, setStats] = useState({ focusTime: 0, completedTasks: 0, remainingTasks: 0 });
  const [logs, setLogs] = useState<any[]>([]);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const init = async () => {
      const q = await generateQuote();
      setQuote(q);
    };
    init();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Listen to active tasks
    const qTasks = query(collection(db, 'tasks'), where('userId', '==', user.uid), where('completed', '==', false));
    const unsubTasks = onSnapshot(qTasks, (snap) => {
      const t = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      t.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setTasks(t.slice(0, 5));
      setStats(prev => ({ ...prev, remainingTasks: snap.size }));
    });

    // Listen to active habits
    const qHabits = query(collection(db, 'habits'), where('userId', '==', user.uid), where('archived', '==', false));
    const unsubHabits = onSnapshot(qHabits, (snap) => {
      const h = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));
      h.sort((a,b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
      setHabits(h.slice(0, 5));
    });

    // Listen to logs
    const unsubLogs = onSnapshot(query(collection(db, 'logs'), where('userId', '==', user.uid)), (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Compute basic stats
    const fetchStats = async () => {
       const logsSnap = await getDocs(query(collection(db, 'logs'), where('userId', '==', user.uid)));
       let totalMins = 0;
       logsSnap.forEach(d => { totalMins += d.data().timeSpent / 60; });
       
       const completedSnap = await getDocs(query(collection(db, 'tasks'), where('userId', '==', user.uid), where('completed', '==', true)));
       
       setStats(prev => ({ ...prev, focusTime: Math.round(totalMins), completedTasks: completedSnap.size }));
    };
    fetchStats();

    return () => {
      unsubTasks();
      unsubHabits();
      unsubLogs();
    };
  }, [user]);

  const toggleTask = async (task: Task) => {
    await updateDoc(doc(db, 'tasks', task.id), {
      completed: !task.completed
    });
    setStats(prev => ({ ...prev, completedTasks: prev.completedTasks + 1 }));
  };

  const toggleToday = async (habitId: string) => {
    if (!user) return;
    const isCompleted = logs.some(l => l.entityId === habitId && l.date === todayStr);
    if (isCompleted) {
      const log = logs.find(l => l.entityId === habitId && l.date === todayStr);
      if (log) {
        // Need to import deleteDoc and addDoc
        const { deleteDoc } = await import('firebase/firestore');
        await deleteDoc(doc(db, 'logs', log.id));
      }
    } else {
      const { addDoc, serverTimestamp } = await import('firebase/firestore');
      await addDoc(collection(db, 'logs'), {
        userId: user.uid,
        entityId: habitId,
        type: 'habit',
        date: todayStr,
        timeSpent: 0,
        completed: true,
        timestamp: serverTimestamp()
      });
    }
  };

  const formatHours = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  return (
    <div className="space-y-8 pb-12 w-full max-w-5xl mx-auto px-4">
      
      {/* Centered Focus Hero */}
      <div className="flex flex-col items-center justify-center text-center mt-4 py-12 space-y-8 bg-white border border-[#E4E6EB] dark:bg-[#242526] dark:border-[#3E4042] rounded-xl shadow-sm relative overflow-hidden">
        
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal via-purple to-coral"></div>
        <Sparkles className="absolute top-8 left-8 text-teal/20" size={48} />
        <Circle className="absolute bottom-8 right-8 text-purple/20" size={64} />

        <div className="space-y-4 max-w-xl mx-auto px-4 relative z-10">
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-gray-100 tracking-tight">Ready, {profile?.displayName?.split(' ')[0] || 'Zen'}?</h1>
            <p className="text-lg md:text-xl text-slate-500 font-medium italic">
               {quote ? `"${quote.text}"` : "Summoning ancient wisdom..."}
            </p>
        </div>
        
        <Link 
          to="/focus" 
          className="group relative flex items-center justify-center gap-3 bg-gradient-to-r from-teal to-purple hover:from-[#0ab28a] hover:to-[#764ce0] text-white px-8 py-4 md:px-10 md:py-5 rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md mt-4 z-10 font-bold"
        >
          <div className="absolute inset-0 rounded-lg bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
          <Play size={28} fill="currentColor" />
          <span className="text-xl md:text-2xl tracking-tight uppercase">FOCUS NOW</span>
        </Link>

        {/* Mini Analytics inside Hero */}
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 mt-6 text-slate-500 dark:text-gray-400 font-semibold uppercase tracking-wider text-xs z-10 bg-slate-50 dark:bg-[#18191A] py-3 px-6 rounded-lg border border-[#E4E6EB] dark:border-[#3E4042]">
           <div className="flex items-center gap-2"><Activity size={16} className="text-teal" /> {formatHours(stats.focusTime)} Focus</div>
           <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-purple" /> {stats.completedTasks} Done</div>
           <div className="flex items-center gap-2"><Circle size={16} className="text-coral" /> {stats.remainingTasks} Remaining</div>
        </div>
      </div>

      {/* Two Column Layout for Tasks and Habits */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Tasks Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E4E6EB] dark:border-[#3E4042] pb-3">
            <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-gray-100 flex items-center gap-2">
               <CheckCircle2 className="text-teal" size={24} /> Action Items
            </h3>
            <div className="flex gap-2 items-center">
              <Link to="/tasks" className="p-1.5 bg-teal/10 text-teal rounded-md hover:bg-teal hover:text-white transition-colors" title="New Task">
                 <Plus size={18} className="font-bold" />
              </Link>
              <Link to="/tasks" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-teal transition-colors">View All</Link>
            </div>
          </div>
          
          <div className="space-y-2">
             <AnimatePresence>
                {tasks.map(task => (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={task.id} 
                    className="group bg-white dark:bg-[#242526] p-4 rounded-lg border border-slate-300 dark:border-[#3E4042] hover:border-teal/50 transition-all flex justify-between items-center shadow-md shadow-slate-200/50 dark:shadow-none"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button 
                         onClick={() => toggleTask(task)}
                         className="flex-shrink-0 text-slate-300 dark:text-slate-600 hover:text-teal transition-colors focus:outline-none"
                      >
                         <Circle size={24} />
                      </button>
                      <span className="font-medium text-base text-slate-800 dark:text-gray-200 line-clamp-1">{task.title}</span>
                    </div>
                    <button 
                      onClick={() => navigate('/focus', { state: { selectedEntity: `task:${task.id}` } })}
                      className="ml-3 opacity-0 group-hover:opacity-100 bg-teal/10 text-teal p-2.5 rounded-md hover:bg-teal hover:text-white transition-all transform hover:scale-105 active:scale-95"
                      title="Focus on this"
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                  </motion.div>
                ))}
             </AnimatePresence>
             {tasks.length === 0 && (
                <div className="py-8 text-center text-slate-400 font-medium bg-white dark:bg-[#242526] rounded-lg border border-dashed border-[#E4E6EB] dark:border-[#3E4042]">
                   You are all caught up on tasks!
                </div>
             )}
          </div>
        </div>

        {/* Habits Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#E4E6EB] dark:border-[#3E4042] pb-3">
            <h3 className="text-xl font-bold tracking-tight text-slate-800 dark:text-gray-100 flex items-center gap-2">
               <Flame className="text-purple" size={24} /> Daily Habits
            </h3>
            <div className="flex gap-2 items-center">
              <Link to="/habits" className="p-1.5 bg-purple/10 text-purple rounded-md hover:bg-purple hover:text-white transition-colors" title="New Habit">
                 <Plus size={18} className="font-bold" />
              </Link>
              <Link to="/habits" className="text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-purple transition-colors">View All</Link>
            </div>
          </div>
          
          <div className="space-y-2">
             <AnimatePresence>
                {habits.map(habit => {
                  const isCompletedToday = logs.some(l => l.entityId === habit.id && l.date === todayStr);

                  return (
                  <motion.div 
                    layout
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={habit.id} 
                    className={`group bg-white dark:bg-[#242526] p-4 rounded-lg border hover:border-purple/50 transition-all flex justify-between items-center shadow-md shadow-slate-200/50 dark:shadow-none ${
                        isCompletedToday ? 'border-teal/50 bg-teal/5' : 'border-slate-300 dark:border-[#3E4042]'
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <button 
                        onClick={() => toggleToday(habit.id)}
                        className={`w-6 h-6 shrink-0 rounded-md flex items-center justify-center transition-all ${
                          isCompletedToday 
                            ? 'bg-teal text-white' 
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {isCompletedToday && <CheckCircle2 size={16} />}
                      </button>
                      <span className={`font-medium text-base text-slate-800 dark:text-gray-200 line-clamp-1 ${isCompletedToday ? 'text-teal' : ''}`}>{habit.title}</span>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); navigate('/focus', { state: { selectedEntity: `habit:${habit.id}` } })}}
                      className="ml-3 opacity-0 group-hover:opacity-100 bg-purple/10 text-purple p-2.5 rounded-md hover:bg-purple hover:text-white transition-all transform hover:scale-105 active:scale-95"
                      title="Focus on this"
                    >
                      <Play size={16} fill="currentColor" />
                    </button>
                  </motion.div>
                )})}
             </AnimatePresence>
             {habits.length === 0 && (
                <div className="py-8 text-center text-slate-400 font-medium bg-white dark:bg-[#242526] rounded-lg border border-dashed border-[#E4E6EB] dark:border-[#3E4042]">
                   No active habits. Time to build some!
                </div>
             )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;

