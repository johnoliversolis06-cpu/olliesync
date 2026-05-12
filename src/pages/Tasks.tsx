import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { Task } from '../types';
import { Plus, Trash2, CheckCircle2, Circle, Play, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import EditTaskModal from '../components/EditTaskModal';

const TIME_PERIODS = [
  { id: 'morning', label: 'Morning Tasks', color: 'text-amber-500' },
  { id: 'afternoon', label: 'Afternoon Tasks', color: 'text-orange-500' },
  { id: 'evening', label: 'Evening Tasks', color: 'text-indigo-400' },
  { id: 'anytime', label: 'Anytime', color: 'text-slate-500' }
] as const;

const TasksPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');
  
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'tasks'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task)));
    });
    return unsubscribe;
  }, [user]);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTaskTitle.trim()) return;
    await addDoc(collection(db, 'tasks'), {
      userId: user.uid,
      title: newTaskTitle,
      completed: false,
      timeOfDay: 'anytime',
      category: 'General',
      createdAt: serverTimestamp()
    });
    setNewTaskTitle('');
  };

  const toggleTask = async (task: Task) => {
    await updateDoc(doc(db, 'tasks', task.id), {
      completed: !task.completed,
      completedAt: !task.completed ? serverTimestamp() : null
    });
  };

  const deleteTask = async (id: string) => {
    await deleteDoc(doc(db, 'tasks', id));
  };

  const activeTasks = tasks.filter(t => !t.completed).sort((a, b) => {
    const timeA = a.createdAt ? (a.createdAt as any).toMillis?.() || 0 : 0;
    const timeB = b.createdAt ? (b.createdAt as any).toMillis?.() || 0 : 0;
    return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
  });

  const completedTasks = tasks.filter(t => t.completed).sort((a, b) => {
    const timeA = a.completedAt ? (a.completedAt as any).toMillis?.() || 0 : (a.createdAt as any)?.toMillis?.() || 0;
    const timeB = b.completedAt ? (b.completedAt as any).toMillis?.() || 0 : (b.createdAt as any)?.toMillis?.() || 0;
    return timeB - timeA;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Your Daily To-Do's</h2>
          <p className="text-slate-500 dark:text-slate-400">Organized by time of day.</p>
        </div>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-slate-100 dark:bg-slate-800 text-sm font-bold p-2 text-slate-500 rounded-lg outline-none cursor-pointer"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </header>

      <form onSubmit={addTask} className="space-y-3">
        <div className="relative group">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="Add a new task..."
            className="w-full p-4 pr-16 bg-white dark:bg-[#242526] rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] focus:border-teal outline-none text-lg font-medium transition-all"
          />
          <button 
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-teal text-white rounded-md flex items-center justify-center hover:opacity-90 active:scale-95 transition-transform"
          >
            <Plus size={24} />
          </button>
        </div>
      </form>

      <div className="space-y-10">
        {TIME_PERIODS.map(period => {
          const pTasks = activeTasks.filter(t => (t.timeOfDay || 'anytime') === period.id);
          if (pTasks.length === 0) return null;
          
          return (
            <div key={period.id} className="space-y-4">
              <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${period.color}`}>
                {period.label} <span className="bg-slate-100 dark:bg-slate-800 text-xs px-2 py-0.5 rounded-md text-slate-500">{pTasks.length}</span>
              </h3>
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {pTasks.map(task => (
                    <motion.div
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      key={task.id}
                      className="group flex flex-col p-4 rounded-lg bg-white dark:bg-[#242526] shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] hover:border-teal/50 transition-all cursor-pointer"
                      onClick={(e) => {
                         if ((e.target as HTMLElement).closest('button')) return;
                         setEditingTask(task);
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleTask(task); }}
                          className="transition-colors flex-shrink-0 text-slate-200 hover:text-teal"
                        >
                          <div className="w-6 h-6 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-teal transition-colors bg-transparent" />
                        </button>
                        
                        <div className="flex-1 flex flex-col justify-center">
                          <span className="text-lg font-medium text-slate-800 dark:text-gray-100 leading-tight">
                            {task.title}
                          </span>
                          {(task.category || task.difficulty) && (
                            <div className="flex items-center gap-2 mt-1">
                              {task.category && <span className="text-xs font-semibold uppercase tracking-widest text-teal">{task.category}</span>}
                              {task.difficulty && <span className="text-xs font-medium text-slate-400 capitalize flex items-center gap-1">({task.difficulty})</span>}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                            <button 
                              onClick={(e) => { e.stopPropagation(); navigate('/focus', { state: { selectedEntity: `task:${task.id}` } }); }}
                              className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-teal hover:bg-teal/10 rounded-lg transition-all flex-shrink-0" title="Focus"
                            >
                              <Play size={20} fill="currentColor" />
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}
                                className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-purple hover:bg-purple/10 rounded-lg transition-all flex-shrink-0" title="Edit"
                              >
                                <Settings2 size={20} />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }}
                              className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-coral hover:bg-coral/10 rounded-lg transition-all flex-shrink-0" title="Delete"
                            >
                              <Trash2 size={20} />
                            </button>
                        </div>
                      </div>
                      
                      {task.notes && (
                         <div className="ml-12 mt-2 text-sm text-slate-500 italic line-clamp-2 pr-8">
                           {task.notes}
                         </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
        {activeTasks.length === 0 && (
          <div className="h-48 border-4 border-dashed border-slate-300 dark:border-slate-800 rounded-3xl flex items-center justify-center text-slate-400 font-bold italic">
            Your task list is empty. Add something new!
          </div>
        )}

        {completedTasks.length > 0 && (
          <div className="pt-8 border-t-2 border-slate-100 dark:border-slate-800 space-y-4">
             <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Completed</h3>
             <div className="space-y-3 opacity-60">
               {completedTasks.slice(0, 5).map(task => (
                 <div
                   key={task.id}
                   className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent transition-all"
                 >
                   <button 
                     onClick={() => toggleTask(task)}
                     className="transition-colors flex-shrink-0 text-teal hover:text-slate-400"
                   >
                     <CheckCircle2 size={24} />
                   </button>
                   
                   <span className="flex-1 text-lg font-bold line-through decoration-teal/30">
                     {task.title}
                   </span>
                   <button 
                     onClick={() => deleteTask(task.id)}
                     className="p-2 text-slate-400 hover:text-coral hover:bg-coral/10 rounded-lg transition-all flex-shrink-0" title="Delete"
                   >
                     <Trash2 size={18} />
                   </button>
                 </div>
               ))}
               {completedTasks.length > 5 && (
                 <p className="text-xs font-bold text-slate-400 text-center pt-2">
                   + {completedTasks.length - 5} more... View them in Analytics
                 </p>
               )}
             </div>
          </div>
        )}
      </div>

      {editingTask && (
         <EditTaskModal task={editingTask} onClose={() => setEditingTask(null)} />
      )}
    </div>
  );
};

export default TasksPage;
