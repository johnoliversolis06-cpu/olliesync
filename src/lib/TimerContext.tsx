import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './auth';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, where, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { Task, Habit } from '../types';
import { getRewardSuggestion } from '../services/gemini';

interface TimerContextType {
  timerType: 'pomodoro' | 'freestyle';
  setTimerType: (type: 'pomodoro' | 'freestyle') => void;
  focusMins: number;
  setFocusMins: (mins: number) => void;
  breakMins: number;
  setBreakMins: (mins: number) => void;
  timeLeft: number;
  setTimeLeft: (time: number) => void;
  elapsedTime: number;
  setElapsedTime: (time: number) => void;
  isActive: boolean;
  setIsActive: (active: boolean) => void;
  mode: 'focus' | 'break';
  setMode: (mode: 'focus' | 'break') => void;
  selectedEntity: string;
  setSelectedEntity: (entityId: string) => void;
  reward: { reward: string, message: string } | null;
  setReward: (reward: { reward: string, message: string } | null) => void;
  tasks: Task[];
  habits: Habit[];
  isSaving: boolean;
  handleComplete: (isManualStop?: boolean) => Promise<void>;
  toggleTimer: () => void;
  resetTimer: () => void;
  formatTime: (seconds: number) => string;
}

const TimerContext = createContext<TimerContextType>({} as TimerContextType);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  
  const [timerType, setTimerType] = useState<'pomodoro' | 'freestyle'>('pomodoro');
  const [focusMins, setFocusMins] = useState(profile?.focusInterval || 25);
  const [breakMins, setBreakMins] = useState(profile?.breakInterval || 5);
  const [timeLeft, setTimeLeft] = useState((profile?.focusInterval || 25) * 60);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('');
  const [reward, setReward] = useState<{ reward: string, message: string } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const handleCompleteRef = useRef<(isManualStop?: boolean) => void>(() => {});
  const lastReminderRef = useRef<number>(0);
  const lastActivityRef = useRef<number>(Date.now());
  const timeLeftRef = useRef(timeLeft);
  const elapsedTimeRef = useRef(elapsedTime);
  const focusMinsRef = useRef(focusMins);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
    elapsedTimeRef.current = elapsedTime;
    focusMinsRef.current = focusMins;
  }, [timeLeft, elapsedTime, focusMins]);

  useEffect(() => {
    const handleActivity = () => { lastActivityRef.current = Date.now(); };
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
    const qTasks = query(collection(db, 'tasks'), where('userId', '==', user.uid), where('completed', '==', false));
    const unsubscribeTasks = onSnapshot(qTasks, (snap) => {
      const taskList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(taskList);
      if (taskList.length > 0 && !selectedEntity) setSelectedEntity(`task:${taskList[0].id}`);
    });

    const qHabits = query(collection(db, 'habits'), where('userId', '==', user.uid), where('archived', '==', false));
    const unsubscribeHabits = onSnapshot(qHabits, (snap) => {
      const habitList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Habit));
      setHabits(habitList);
      if (habitList.length > 0 && !selectedEntity && tasks.length === 0) setSelectedEntity(`habit:${habitList[0].id}`);
    });

    return () => { unsubscribeTasks(); unsubscribeHabits(); };
  }, [user]);

  useEffect(() => {
    if (!isActive) return;

    const startTimestamp = Date.now();
    const initialTimeLeft = timeLeftRef.current;
    const initialElapsedTime = elapsedTimeRef.current;

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - startTimestamp) / 1000);

      if (timerType === 'pomodoro') {
        const nextTimeLeft = Math.max(0, initialTimeLeft - elapsedSeconds);
        setTimeLeft(nextTimeLeft);
        
        if (nextTimeLeft <= 0 && initialTimeLeft > 0) {
          setTimeout(() => handleCompleteRef.current(), 0);
          return;
        }
      } else {
        setElapsedTime(initialElapsedTime + elapsedSeconds);
      }

      const currentTotal = timerType === 'pomodoro' 
        ? (focusMinsRef.current * 60 - Math.max(0, initialTimeLeft - elapsedSeconds))
        : (initialElapsedTime + elapsedSeconds);
        
      if (currentTotal > 0 && currentTotal % 1800 === 0 && currentTotal !== lastReminderRef.current) {
        lastReminderRef.current = currentTotal;
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Deep Focus Check", { body: "You've been focused for 30 minutes! Keep it steady." });
        }
      }

      const inactivityDuration = (now - lastActivityRef.current) / 1000;
      const limit = (profile?.autoCutoffDuration || 60) * 60;
      if (inactivityDuration > limit) {
        setIsActive(false);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Timer Auto Cut-off", { body: "The timer was stopped due to inactivity." });
        }
      }
    }, 500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timerType, profile?.autoCutoffDuration]);

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
  
  handleCompleteRef.current = handleComplete;

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
    <TimerContext.Provider value={{
      timerType, setTimerType,
      focusMins, setFocusMins,
      breakMins, setBreakMins,
      timeLeft, setTimeLeft,
      elapsedTime, setElapsedTime,
      isActive, setIsActive,
      mode, setMode,
      selectedEntity, setSelectedEntity,
      reward, setReward,
      tasks, habits, isSaving,
      handleComplete, toggleTimer, resetTimer, formatTime
    }}>
      {children}
    </TimerContext.Provider>
  );
};

export const useTimer = () => useContext(TimerContext);
