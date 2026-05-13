import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Play, Pause, RotateCcw, Coffee, Brain, Sparkles, Settings2, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimer } from '../lib/TimerContext';

const FocusPage: React.FC = () => {
  const location = useLocation();
  const {
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
  } = useTimer();

  useEffect(() => {
    if (location.state?.selectedEntity) {
      setSelectedEntity(location.state.selectedEntity);
    }
  }, [location.state?.selectedEntity, setSelectedEntity]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-10 lg:gap-14 px-4 w-full max-w-4xl mx-auto">
      <div className="flex bg-slate-100 dark:bg-[#18191A] p-1 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] w-full max-w-sm justify-center">
        <button 
          onClick={() => { setTimerType('pomodoro'); resetTimer(); }}
          disabled={isActive || elapsedTime > 0 || (timerType === 'pomodoro' && timeLeft < focusMins * 60)}
          className={`flex-1 py-2.5 rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${timerType === 'pomodoro' ? 'bg-white dark:bg-[#242526] text-teal shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Pomodoro
        </button>
        <button 
          onClick={() => { setTimerType('freestyle'); resetTimer(); }}
          disabled={isActive || elapsedTime > 0 || (timerType === 'pomodoro' && timeLeft < focusMins * 60)}
          className={`flex-1 py-2.5 rounded-md font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${timerType === 'freestyle' ? 'bg-white dark:bg-[#242526] text-purple shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
        >
          Freestyle
        </button>
      </div>

      <div className="text-center space-y-4 md:space-y-6 w-full">
        <div className="flex items-center justify-center gap-2">
          {timerType === 'pomodoro' && !isActive && (mode === 'focus' ? timeLeft >= focusMins * 60 : timeLeft >= breakMins * 60) ? (
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
            disabled={isActive || elapsedTime > 0 || (timerType === 'pomodoro' && Math.floor(timeLeft) < focusMins * 60)}
            className="w-full p-4 rounded-lg bg-white dark:bg-[#242526] border border-slate-300 dark:border-[#3E4042] text-lg font-medium outline-none focus:border-teal transition-all cursor-pointer shadow-md shadow-slate-200/50 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
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
