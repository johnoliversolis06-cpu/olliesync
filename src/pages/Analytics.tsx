import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Task, Log } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Brain, Trophy, Calendar, CheckCircle2, Activity, CheckSquare } from 'lucide-react';
import { motion } from 'framer-motion';

const AnalyticsPage: React.FC = () => {
  const { user } = useAuth();
  const [taskStats, setTaskStats] = useState<any[]>([]);
  const [weeklyFocus, setWeeklyFocus] = useState<any[]>([]);
  const [totalFocusMins, setTotalFocusMins] = useState(0);
  const [tasksCompleted, setTasksCompleted] = useState(0);
  const [mostProductiveDay, setMostProductiveDay] = useState('N/A');
  const [recentCompleted, setRecentCompleted] = useState<Task[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[][]>([]);
  const [emptyLeadingDays, setEmptyLeadingDays] = useState(0);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
  const [entireActivityMap, setEntireActivityMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user) return;
      
      // Task Stats & Completed tasks list
      const tasksSnap = await getDocs(query(collection(db, 'tasks'), where('userId', '==', user.uid)));
      const categories: {[key: string]: number} = {};
      let completedCount = 0;
      let allCompletedTasks: Task[] = [];
      
      tasksSnap.forEach(doc => {
        const data = doc.data() as Task;
        if (data.completed) {
          completedCount++;
          allCompletedTasks.push({ id: doc.id, ...data });
        }
        const cat = data.category || 'General';
        categories[cat] = (categories[cat] || 0) + 1;
      });
      
      // Sort completed tasks descending by completion date (assuming createdAt for now if completedAt is missing)
      allCompletedTasks.sort((a, b) => {
        const timeA = a.completedAt ? (a.completedAt as any).toMillis?.() || 0 : (a.createdAt as any)?.toMillis?.() || 0;
        const timeB = b.completedAt ? (b.completedAt as any).toMillis?.() || 0 : (b.createdAt as any)?.toMillis?.() || 0;
        return timeB - timeA;
      });

      setRecentCompleted(allCompletedTasks.slice(0, 5));
      setTasksCompleted(completedCount);
      setTaskStats(Object.keys(categories).map(name => ({ name, value: categories[name] })));

      // Weekly Focus & Heatmap
      const logsSnap = await getDocs(query(collection(db, 'logs'), where('userId', '==', user.uid)));
      
      const now = new Date();
      // Normalize to 00:00:00 local time
      const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const sevenDaysAgo = new Date(todayLocal.getTime());
      sevenDaysAgo.setDate(todayLocal.getDate() - 6); 

      const dayMap: { [key: string]: number } = {};
      const orderedDays: string[] = [];
      
      for (let i = 0; i < 7; i++) {
        const d = new Date(sevenDaysAgo.getTime());
        d.setDate(sevenDaysAgo.getDate() + i);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        orderedDays.push(dayName);
        dayMap[dayName] = 0;
      }

      let totalMins = 0;
      const dayTotalsAllTime: {[key: string]: number} = { 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0, 'Sun': 0 };
      const heatActivityMap: Record<string, number> = {};
      
      let minYear = now.getFullYear();
      let maxYear = now.getFullYear();

      logsSnap.forEach(doc => {
        const data = doc.data();
        const mins = data.timeSpent / 60;
        totalMins += mins;
        
        let dateObj: Date;
        if (data.createdAt?.toDate) {
            dateObj = data.createdAt.toDate();
        } else {
            dateObj = new Date(data.date);
        }
        
        const year = dateObj.getFullYear();
        if (year < minYear) minYear = year;
        if (year > maxYear) maxYear = year;

        const day = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
        dayTotalsAllTime[day] = (dayTotalsAllTime[day] || 0) + mins;
        
        // Truncate to start of day for comparison
        const logDayLocal = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());

        // Weekly focus
        if (logDayLocal >= sevenDaysAgo && logDayLocal <= todayLocal) {
            if (dayMap[day] !== undefined) {
                dayMap[day] += mins;
            }
        }

        // Entire history mapping
        const isoStr = new Date(logDayLocal.getTime() - (logDayLocal.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
        heatActivityMap[isoStr] = (heatActivityMap[isoStr] || 0) + mins;
      });
      
      const years = [];
      for(let y = maxYear; y >= minYear; y--) years.push(y);
      setAvailableYears(years);
      setEntireActivityMap(heatActivityMap);
      
      setTotalFocusMins(Math.round(totalMins));
      
      // Calculate most productive day
      let maxDay = 'N/A';
      let maxMins = -1;
      Object.keys(dayTotalsAllTime).forEach(day => {
          if (dayTotalsAllTime[day] > maxMins && dayTotalsAllTime[day] > 0) {
              maxMins = dayTotalsAllTime[day];
              maxDay = day;
          }
      });
      setMostProductiveDay(maxDay === 'N/A' || maxMins === 0 ? 'Not Enough Data' : maxDay);

      setWeeklyFocus(orderedDays.map(day => ({ name: day, minutes: Math.round(dayMap[day]) })));
    };
    
    fetchAnalytics();
  }, [user]);

  useEffect(() => {
    // Generate heatmap grid sequence for the selected year
    const heatmapVals = [];
    
    const startDate = new Date(selectedYear, 0, 1);
    let emptyLeadingDaysLocal = startDate.getDay();
    setEmptyLeadingDays(emptyLeadingDaysLocal);
    
    let currentWeek: any[] = Array.from({ length: emptyLeadingDaysLocal }).map(() => ({ isEmpty: true }));

    const isLeapYear = (selectedYear % 4 === 0 && selectedYear % 100 !== 0) || (selectedYear % 400 === 0);
    const daysInYear = isLeapYear ? 366 : 365;

    for (let i = 0; i < daysInYear; i++) {
      const currentD = new Date(selectedYear, 0, i + 1);
      const isoStr = new Date(currentD.getTime() - (currentD.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      
      const mins = entireActivityMap[isoStr] || 0;
      let level = 0;
      if (mins > 0 && mins <= 15) level = 1;
      else if (mins > 15 && mins <= 45) level = 2;
      else if (mins > 45 && mins <= 90) level = 3;
      else if (mins > 90) level = 4;
      
      currentWeek.push({ isEmpty: false, date: isoStr, mins, level, dayOfWeek: currentD.getDay(), dateObj: currentD });
      
      if (currentWeek.length === 7) {
          heatmapVals.push(currentWeek);
          currentWeek = [];
      }
    }
    
    if (currentWeek.length > 0) {
        while(currentWeek.length < 7) {
            currentWeek.push({ isEmpty: true });
        }
        heatmapVals.push(currentWeek);
    }
    
    setHeatmapData(heatmapVals as any);
  }, [selectedYear, entireActivityMap]);

  const COLORS = ['#14b8a6', '#8b5cf6', '#f43f5e', '#eab308', '#3b82f6'];

  const formatHours = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  };

  const mapLevelToColor = (level: number) => {
     switch (level) {
       case 1: return 'bg-teal/30';
       case 2: return 'bg-teal/60';
       case 3: return 'bg-teal/80';
       case 4: return 'bg-teal';
       default: return 'bg-slate-100 dark:bg-slate-800'; // level 0
     }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-sm pb-12">
      <header className="flex items-center gap-3">
        <div className="bg-purple text-white p-3 rounded-2xl">
          <Trophy size={32} />
        </div>
        <div>
           <h2 className="text-3xl font-black tracking-tight text-navy dark:text-white">Your Insights</h2>
           <p className="text-slate-500 font-bold">Review your progress over time.</p>
        </div>
      </header>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white dark:bg-[#242526] p-6 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] flex items-center gap-4">
           <div className="bg-teal/10 text-teal p-3.5 rounded-lg">
              <Brain size={28} />
           </div>
           <div>
             <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Total Focus</p>
             <h4 className="text-2xl font-bold text-slate-800 dark:text-gray-100">{formatHours(totalFocusMins)}</h4>
           </div>
        </motion.div>
        
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-[#242526] p-6 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] flex items-center gap-4">
           <div className="bg-coral/10 text-coral p-3.5 rounded-lg">
              <CheckCircle2 size={28} />
           </div>
           <div>
             <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Tasks Completed</p>
             <h4 className="text-2xl font-bold text-slate-800 dark:text-gray-100">{tasksCompleted}</h4>
           </div>
        </motion.div>

        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-white dark:bg-[#242526] p-6 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] flex items-center gap-4">
           <div className="bg-purple/10 text-purple p-3.5 rounded-lg">
              <Calendar size={28} />
           </div>
           <div>
             <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Best Day</p>
             <h4 className="text-2xl font-bold text-slate-800 dark:text-gray-100">{mostProductiveDay}</h4>
           </div>
        </motion.div>
      </div>

      {/* GitHub Style Heatmap */}
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-[#242526] p-6 md:p-8 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] overflow-x-auto">
        <div className="flex items-center justify-between mb-6 min-w-[700px]">
           <div className="flex items-center gap-4">
               <h3 className="text-lg font-bold text-slate-800 dark:text-gray-100 flex items-center gap-2">
                  <Activity size={20} className="text-coral" /> Activity History
               </h3>
               <select 
                 value={selectedYear}
                 onChange={(e) => setSelectedYear(Number(e.target.value))}
                 className="bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm font-bold text-slate-700 dark:text-slate-300 py-1.5 px-3 focus:ring-2 focus:ring-teal cursor-pointer"
               >
                 {availableYears.map(year => (
                   <option key={year} value={year}>{year}</option>
                 ))}
               </select>
           </div>
           <div className="flex items-center gap-2 text-xs font-bold text-slate-400 shrink-0">
             <span>Less</span>
             <div className="flex gap-1">
               <div className="w-3.5 h-3.5 rounded-sm bg-slate-100 dark:bg-slate-800" />
               <div className="w-3.5 h-3.5 rounded-sm bg-teal/30" />
               <div className="w-3.5 h-3.5 rounded-sm bg-teal/60" />
               <div className="w-3.5 h-3.5 rounded-sm bg-teal/80" />
               <div className="w-3.5 h-3.5 rounded-sm bg-teal" />
             </div>
             <span>More</span>
           </div>
        </div>

        <div className="min-w-max flex flex-col relative mt-4">
           <div className="flex gap-2">
              {/* Heatmap Grid */}
              <div className="flex gap-[0.15rem]">
                 {heatmapData.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[0.15rem]">
                       {week.map((day: any, dIdx: number) => {
                          if (day.isEmpty) {
                              return <div key={`empty-${wIdx}-${dIdx}`} className="w-4 h-4 bg-transparent" />;
                          }
                          const dateStr = new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                          return (
                             <div 
                               key={day.date} 
                               title={`${dateStr}: ${Math.round(day.mins)} minutes of focus`} 
                               className={`w-4 h-4 rounded-[2px] ${mapLevelToColor(day.level)} hover:ring-2 ring-black/20 dark:ring-white/20 transition-all cursor-pointer relative group border border-black/5 dark:border-white/5`}
                             >
                               {/* Tooltip on hover */}
                               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col items-center z-50">
                                 <div className="bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-xl">
                                   {Math.round(day.mins)} mins on {dateStr}
                                 </div>
                                 <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-slate-800 absolute top-full"></div>
                               </div>
                             </div>
                          );
                       })}
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Focus Time */}
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-[#242526] p-6 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] h-[350px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 dark:text-gray-100 mb-6 flex items-center gap-2"><Calendar size={20} className="text-teal" /> Last 7 Days (Focus Mins)</h3>
          <div className="flex-1 w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyFocus} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 'bold' }} />
                <Tooltip 
                   cursor={{fill: 'rgba(20, 184, 166, 0.1)'}} 
                   contentStyle={{backgroundColor: '#1e293b', color: '#fff', borderRadius: '0.5rem', border: 'none', fontWeight: 'bold'}}
                   itemStyle={{ color: '#0CAF89' }}
                />
                <Bar dataKey="minutes" fill="#0CAF89" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
        
        {/* Category Breakdown */}
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }} className="bg-white dark:bg-[#242526] p-6 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] h-[350px] flex flex-col">
          <h3 className="text-lg font-bold text-slate-800 dark:text-gray-100 mb-6 flex items-center gap-2"><Brain size={20} className="text-purple"/> Task Categories</h3>
          <div className="flex-1 w-full relative group">
             {taskStats.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 font-medium border border-dashed border-[#E4E6EB] dark:border-[#3E4042] rounded-lg">No tasks created yet</div>
             ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {taskStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                       contentStyle={{backgroundColor: '#1e293b', color: '#fff', borderRadius: '0.5rem', border: 'none', fontWeight: 'bold'}}
                       itemStyle={{ color: '#fff' }}
                    />
                    <Legend 
                       verticalAlign="bottom" 
                       height={36} 
                       iconType="circle"
                       wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
             )}
          </div>
        </motion.div>
      </div>

      {/* Done Tasks List */}
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white dark:bg-[#242526] p-6 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042]">
        <h3 className="text-lg font-bold text-slate-800 dark:text-gray-100 mb-6 flex items-center gap-2">
           <CheckSquare size={20} className="text-coral" /> Recently Completed Tasks
        </h3>
        <div className="space-y-4">
           {recentCompleted.length > 0 ? (
             recentCompleted.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#18191A] rounded-lg border border-[#E4E6EB] dark:border-[#3E4042]">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-teal/10 text-teal flex items-center justify-center shrink-0">
                      <CheckCircle2 size={16} />
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-gray-200">{task.title}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 bg-white dark:bg-[#242526] border border-[#E4E6EB] dark:border-[#3E4042] text-slate-500 rounded-md font-medium">
                    {task.category || 'General'}
                  </span>
                </div>
             ))
           ) : (
             <div className="p-8 border border-dashed border-[#E4E6EB] dark:border-[#3E4042] rounded-lg text-center text-slate-400 font-medium">
               No tasks completed yet. Time to get moving!
             </div>
           )}
        </div>
      </motion.div>

    </div>
  );
};

export default AnalyticsPage;


