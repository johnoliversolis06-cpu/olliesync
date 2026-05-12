import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Pause, RotateCcw, Coffee, Brain, Sparkles, Settings2, Square } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Task, Habit } from '../types';
import { getRewardSuggestion } from '../services/gemini';
import { motion, AnimatePresence } from 'framer-motion';

const FocusPage: React.FC = () => {
  const { user, profile } = useAuth();
  const location = useLocation();
  const [timerType, setTimerType] = useState<'pomodoro' | 'freestyle'>('pomodoro');
  const [focusMins, setFocusMins] = useState(profile?.focusInterval || 25);
  const [breakMins, setBreakMins] = useState(profile?.breakInterval || 5);
  const [timeLeft, setTimeLeft] = useState((profile?.focusInterval || 25) * 60); // Used for pomodoro countdown
  const [elapsedTime, setElapsedTime] = useState(0); // Used for freestyle stopwatch
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>(location.state?.selectedEntity || ''); // format: "task:ID" or "habit:ID"
  const [reward, setReward] = useState<{ reward: string, message: string } | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastReminderRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (location.state?.selectedEntity) {
      setSelectedEntity(location.state.selectedEntity);
    }
  }, [location.state?.selectedEntity]);

  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
    };
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Fetch active Tasks
    const qTasks = query(collection(db, 'tasks'), where('userId', '==', user.uid), where('completed', '==', false));
    const unsubscribeTasks = onSnapshot(qTasks, (snap) => {
      const taskList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(taskList);
      // Auto-select first item if nothing is selected
      if (taskList.length > 0 && !selectedEntity) setSelectedEntity(`task:${taskList[0].id}`);
    });

    // Fetch active Habits
    const qHabits = query(collection(db, 'habits'), where('userId', '==', user.uid), where('archived', '==', false));
    const unsubscribeHabits = onSnapshot(qHabits, (snap) => {
      const habitList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));
      setHabits(habitList);
      if (habitList.length > 0 && !selectedEntity && tasks.length === 0) setSelectedEntity(`habit:${habitList[0].id}`);
    });

    return () => {
      unsubscribeTasks();
      unsubscribeHabits();
    };
  }, [user]);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        if (timerType === 'pomodoro') {
          setTimeLeft(prev => {
            if (prev <= 1) {
              handleComplete();
              return 0;
            }
            return prev - 1;
          });
        } else {
          setElapsedTime(prev => prev + 1);
        }
        
        // Reminder every 30 mins
        const currentTotal = timerType === 'pomodoro' ? (focusMins * 60 - timeLeft) : elapsedTime;
        if (currentTotal > 0 && currentTotal % 1800 === 0 && currentTotal !== lastReminderRef.current) {
          lastReminderRef.current = currentTotal;
          new Notification("Deep Focus Check", { body: "You've been focused for 30 minutes! Keep it steady." });
        }

        // Auto cut-off logic
        const inactivityDuration = (Date.now() - lastActivityRef.current) / 1000;
        const limit = (profile?.autoCutoffDuration || 60) * 60;
        if (inactivityDuration > limit) {
          setIsActive(false);
          new Notification("Timer Auto Cut-off", { body: "The timer was stopped due to inactivity." });
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timerType, timeLeft, elapsedTime]);

  const handleComplete = async (isManualStop: boolean = false) => {
    if (isSaving) return;
    setIsSaving(true);
    setIsActive(false);
    const sessionTime = timerType === 'pomodoro' ? (focusMins * 60) - timeLeft : elapsedTime;

    try {
      if (mode === 'focus' && sessionTime > 0) {
        if (user) {
          let type = 'task';
          let entityId = 'none';
          
          if (selectedEntity) {
            const parts = selectedEntity.split(':');
            type = parts[0];
            entityId = parts[1] || 'none';
          }

          await addDoc(collection(db, 'logs'), {
            userId: user.uid,
            entityId: entityId,
            type: type as 'task' | 'habit',
            date: new Date().toISOString().split('T')[0],
            timeSpent: sessionTime,
            completed: true,
            timestamp: serverTimestamp()
          });
          
          let taskName = 'General Focus';
          if (type === 'task' && entityId !== 'none') {
            taskName = tasks.find(t => t.id === entityId)?.title || 'Task';
            // Mark task as completed if manual stop is used when working on a task
            if (isManualStop) {
              await updateDoc(doc(db, 'tasks', entityId), {
                completed: true
              });
              setSelectedEntity('');
            }
          } else if (type === 'habit' && entityId !== 'none') {
            taskName = habits.find(h => h.id === entityId)?.title || 'Habit';
          }

          const suggestion = await getRewardSuggestion(taskName);
          setReward(suggestion);
        }
        
        if (isManualStop) {
          setMode('focus');
          setTimeLeft(focusMins * 60);
        } else if (timerType === 'pomodoro') {
          setMode('break');
          setTimeLeft(breakMins * 60);
        }
      } else if (mode === 'break') {
        setMode('focus');
        setTimeLeft(focusMins * 60);
        setReward(null);
      }

      if (timerType === 'freestyle' || isManualStop) {
        setElapsedTime(0);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(mode === 'focus' ? focusMins * 60 : breakMins * 60);
    setElapsedTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-10 lg:gap-14 px-4 w-full max-w-4xl mx-auto">
      <div className="flex bg-slate-100 dark:bg-[#18191A] p-1 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] w-full max-w-sm justify-center">
        <button 
          onClick={() => { setTimerType('pomodoro'); resetTimer(); }}
          className={`flex-1 py-2.5 rounded-md font-medium transition-all ${timerType === 'pomodoro' ? 'bg-white dark:bg-[#242526] text-teal shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Pomodoro
        </button>
        <button 
          onClick={() => { setTimerType('freestyle'); resetTimer(); }}
          className={`flex-1 py-2.5 rounded-md font-medium transition-all ${timerType === 'freestyle' ? 'bg-white dark:bg-[#242526] text-purple shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Freestyle
        </button>
      </div>

      <div className="text-center space-y-4 md:space-y-6 w-full">
        <div className="flex items-center justify-center gap-2">
          {timerType === 'pomodoro' && !isActive ? (
            <div className="flex items-center gap-2 bg-slate-50 dark:bg-[#18191A] px-4 py-2 rounded-lg text-sm font-semibold uppercase tracking-widest text-teal transition-colors border border-transparent focus-within:border-teal/30 focus-within:bg-teal/5">
              <Settings2 size={16} />
              <input 
                type="number" 
                value={mode === 'focus' ? focusMins : breakMins} 
                onChange={(e) => {
                  const val = Number(e.target.value) || 1;
                  if (mode === 'focus') { setFocusMins(val); setTimeLeft(val * 60); }
                  else { setBreakMins(val); setTimeLeft(val * 60); }
                }}
                className="bg-transparent w-16 text-center outline-none border-b border-teal/30 border-dashed focus:border-teal"
              />
              mins
            </div>
          ) : (
            <h2 className="text-sm font-semibold uppercase tracking-widest text-teal bg-teal/10 px-4 py-2 rounded-lg">
               {mode === 'focus' ? (timerType === 'pomodoro' ? `Deep Work (${focusMins}m)` : 'Open Session') : 'Quick Break'}
            </h2>
          )}
        </div>
        <motion.div 
          key={timerType === 'pomodoro' ? timeLeft : elapsedTime}
          initial={{ scale: 0.95 }}
          animate={{ scale: 1 }}
          className={`text-[5rem] sm:text-[8rem] md:text-[10rem] lg:text-[12rem] font-bold leading-none tracking-tighter tabular-nums drop-shadow-sm select-none ${
            timerType === 'pomodoro' ? 'text-slate-800 dark:text-gray-100' : 'text-purple'
          }`}
        >
          {formatTime(timerType === 'pomodoro' ? timeLeft : elapsedTime)}
        </motion.div>
      </div>

      <div className="flex flex-col items-center gap-8 w-full max-w-md">
        <div className="w-full space-y-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 px-2">What are you focusing on?</label>
          <select 
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className="w-full p-4 rounded-lg bg-white dark:bg-[#242526] border border-slate-300 dark:border-[#3E4042] text-lg font-medium outline-none focus:border-teal transition-all cursor-pointer shadow-md shadow-slate-200/50 dark:shadow-none"
          >
            <option value="" disabled>Select something to work on</option>
            {tasks.length > 0 && (
              <optgroup label="Tasks">
                {tasks.map(task => (
                  <option key={task.id} value={`task:${task.id}`}>[Task] {task.title}</option>
                ))}
              </optgroup>
            )}
            {habits.length > 0 && (
              <optgroup label="Habits">
                {habits.map(habit => (
                  <option key={habit.id} value={`habit:${habit.id}`}>[Habit] {habit.title}</option>
                ))}
              </optgroup>
            )}
          </select>
        </div>

        <div className="flex items-center justify-center gap-4 w-full">
          <button 
            onClick={resetTimer}
            className="w-14 h-14 rounded-full border border-slate-300 dark:border-[#3E4042] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#18191A] transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-gray-200 bg-white dark:bg-[#242526] shadow-md shadow-slate-200/50 dark:shadow-none"
            title="Reset Timer"
          >
            <RotateCcw size={20} />
          </button>
          
          <button 
            onClick={toggleTimer}
            className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white shadow-lg transition-all transform hover:scale-105 active:scale-95 ${
              isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-teal hover:opacity-90'
            }`}
          >
            {isActive ? <Pause size={36} fill="currentColor" /> : <Play size={36} fill="currentColor" className="ml-2" />}
          </button>

          {((timerType === 'pomodoro' && timeLeft < focusMins * 60) || (timerType === 'freestyle' && elapsedTime > 0)) && (
            <button 
              onClick={() => handleComplete(true)}
              disabled={isSaving}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-coral text-white flex items-center justify-center shadow-lg transition-all transform ${isSaving ? 'opacity-70 cursor-not-allowed scale-95' : 'hover:scale-105 active:scale-95 hover:opacity-90'}`}
              title="Stop & Save Session"
            >
              <div className="flex flex-col items-center">
                 {isSaving ? (
                     <Sparkles size={24} className="animate-spin" />
                 ) : (
                     <Square size={24} fill="currentColor" />
                 )}
                 <span className="text-[10px] font-bold uppercase tracking-widest mt-1">{isSaving ? 'Saving' : 'Stop'}</span>
              </div>
            </button>
          )}

          {!((timerType === 'pomodoro' && timeLeft < focusMins * 60) || (timerType === 'freestyle' && elapsedTime > 0)) && (
            <button 
              onClick={() => setMode(mode === 'focus' ? 'break' : 'focus')}
              className="w-14 h-14 rounded-full border border-slate-300 dark:border-[#3E4042] flex items-center justify-center hover:bg-slate-50 dark:hover:bg-[#18191A] transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-gray-200 shadow-md shadow-slate-200/50 dark:shadow-none bg-white dark:bg-[#242526]"
              title={mode === 'focus' ? 'Take Break' : 'Focus Mode'}
            >
              {mode === 'focus' ? <Coffee size={20} /> : <Brain size={20} />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {reward && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="w-full max-w-sm bg-white dark:bg-[#242526] p-6 rounded-lg shadow-lg text-slate-900 dark:text-white flex flex-col items-center gap-4 text-center border border-[#E4E6EB] dark:border-[#3E4042] mt-4"
          >
             <div className="bg-amber-100 dark:bg-amber-900/30 p-4 rounded-full">
               <Sparkles size={32} className="text-amber-500" />
             </div>
             <div>
               <h3 className="font-bold text-xl tracking-tight mb-2">Session Complete!</h3>
               <p className="font-medium text-sm text-purple bg-purple/10 px-4 py-2 rounded-lg inline-block mb-3">Reward: {reward.reward}</p>
               <p className="text-sm italic font-medium tracking-wide text-slate-500 dark:text-slate-400">"{reward.message}"</p>
             </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FocusPage;
