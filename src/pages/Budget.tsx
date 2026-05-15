import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../lib/auth';
import { BudgetItem } from '../types';
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, PieChart as PieChartIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

const EXPENSE_CATEGORIES = ['Needs', 'Wants', 'Savings/Debt'];
const COLORS = ['#14b8a6', '#f43f5e', '#8b5cf6', '#eab308', '#3b82f6'];

const BudgetPage: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'budget'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snap) => {
      setItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BudgetItem)));
    });
    return unsubscribe;
  }, [user]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title.trim() || !amount) return;
    await addDoc(collection(db, 'budget'), {
      userId: user.uid,
      title,
      amount: parseFloat(amount),
      type,
      category: type === 'income' ? 'Income' : category,
      date: new Date().toISOString().split('T')[0],
      createdAt: serverTimestamp()
    });
    setTitle('');
    setAmount('');
  };

  const deleteItem = async (id: string) => {
    await deleteDoc(doc(db, 'budget', id));
  };

  const totalIncome = items.filter(i => i.type === 'income').reduce((acc, i) => acc + i.amount, 0);
  const totalExpense = items.filter(i => i.type === 'expense').reduce((acc, i) => acc + i.amount, 0);
  const totalBalance = totalIncome - totalExpense;

  const expensesByCategory = items.filter(i => i.type === 'expense').reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  })).filter(d => d.value > 0);

  // Weekly Analytics
  const today = new Date();
  
  const getDayStr = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(today.getDate() - 6);
  
  const lastWeekStart = new Date(today);
  lastWeekStart.setDate(today.getDate() - 13);
  const lastWeekEnd = new Date(today);
  lastWeekEnd.setDate(today.getDate() - 7);

  const thisWeekStr = getDayStr(thisWeekStart);
  const lastWeekStartStr = getDayStr(lastWeekStart);
  const lastWeekEndStr = getDayStr(lastWeekEnd);

  const thisWeekItems = items.filter(i => i.date >= thisWeekStr);
  const lastWeekItems = items.filter(i => i.date >= lastWeekStartStr && i.date <= lastWeekEndStr);

  const thisWeekNet = thisWeekItems.filter(i => i.type === 'income').reduce((acc, i) => acc + i.amount, 0) - thisWeekItems.filter(i => i.type === 'expense').reduce((acc, i) => acc + i.amount, 0);
  const lastWeekNet = lastWeekItems.filter(i => i.type === 'income').reduce((acc, i) => acc + i.amount, 0) - lastWeekItems.filter(i => i.type === 'expense').reduce((acc, i) => acc + i.amount, 0);
  
  const netDiff = thisWeekNet - lastWeekNet;
  const netDiffPercent = lastWeekNet === 0 ? (thisWeekNet > 0 ? 100 : (thisWeekNet < 0 ? -100 : 0)) : (netDiff / Math.abs(lastWeekNet)) * 100;

  // Last 7 days breakdown for the chart
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    last7Days.push(getDayStr(d));
  }

  const dailyChartData = last7Days.map(dateStr => {
    const dayItems = items.filter(i => i.date === dateStr);
    const income = dayItems.filter(i => i.type === 'income').reduce((acc, i) => acc + i.amount, 0);
    const expense = dayItems.filter(i => i.type === 'expense').reduce((acc, i) => acc + i.amount, 0);
    
    // Parse the date to get a short readable format
    const [y, m, d] = dateStr.split('-');
    const dObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const label = dObj.toLocaleDateString('en-US', { weekday: 'short' });

    return { name: label, Income: income, Expense: expense };
  });


  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <header>
        <h2 className="text-3xl font-black tracking-tight flex items-center gap-2">
          <Wallet className="text-navy dark:text-white" />
          Budget Tracker
        </h2>
        <p className="text-slate-500 font-bold">A simple, clean overview of your finances.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#1C1E21] text-white p-6 rounded-xl shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-1">Total Balance</p>
            <h3 className="text-3xl font-bold tracking-tight mb-4">₱{totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            
            <div className="flex justify-between text-sm font-medium border-t border-white/20 pt-4 mt-4">
               <div>
                  <p className="text-teal mb-1 flex items-center gap-1"><TrendingUp size={14}/> Income</p>
                  <p>₱{totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
               </div>
               <div className="text-right">
                  <p className="text-coral mb-1 flex items-center gap-1 justify-end"><TrendingDown size={14}/> Expense</p>
                  <p>₱{totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
               </div>
            </div>

            <div className="border-t border-white/20 pt-4 mt-4">
               <p className="text-xs font-semibold uppercase tracking-widest opacity-60 mb-2">Weekly Trend (7 Days)</p>
               <div className="flex items-center gap-2">
                 {netDiff > 0 ? (
                   <span className="bg-teal/20 text-teal px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                     <TrendingUp size={12} /> +{netDiffPercent.toFixed(1)}%
                   </span>
                 ) : netDiff < 0 ? (
                   <span className="bg-coral/20 text-coral px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                     <TrendingDown size={12} /> {netDiffPercent.toFixed(1)}%
                   </span>
                 ) : (
                   <span className="bg-slate-500/20 text-slate-300 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                     — 0.0%
                   </span>
                 )}
                 <p className="text-sm font-medium">vs previous week</p>
               </div>
               <p className="text-xs text-white/50 mt-1">
                 Net this week: <span className={thisWeekNet >= 0 ? "text-teal" : "text-coral"}>₱{thisWeekNet.toLocaleString('en-US')}</span>
               </p>
            </div>
          </div>

          <form onSubmit={addItem} className="bg-white dark:bg-[#242526] p-6 rounded-lg shadow-md shadow-slate-200/50 dark:shadow-none space-y-4 border border-slate-300 dark:border-[#3E4042]">
             <h3 className="font-bold uppercase text-xs tracking-widest text-slate-400">Quick Log</h3>
             <div className="flex rounded-lg bg-slate-100 dark:bg-[#18191A] p-1">
                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-1.5 rounded-md font-bold text-xs uppercase transition-all ${type === 'expense' ? 'bg-white dark:bg-[#242526] text-coral shadow-sm' : 'text-slate-500'}`}>Expense</button>
                <button type="button" onClick={() => setType('income')} className={`flex-1 py-1.5 rounded-md font-bold text-xs uppercase transition-all ${type === 'income' ? 'bg-white dark:bg-[#242526] text-teal shadow-sm' : 'text-slate-500'}`}>Income</button>
             </div>
             
             <input type="text" placeholder="Description (e.g. Salary, Groceries)" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-[#18191A] rounded-lg border border-[#E4E6EB] dark:border-[#3E4042] outline-none focus:border-purple font-medium transition-all text-sm" />
             <input type="number" placeholder="Amount (₱)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-[#18191A] rounded-lg border border-[#E4E6EB] dark:border-[#3E4042] outline-none focus:border-purple font-medium transition-all text-sm" />
             
             {type === 'expense' && (
               <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-[#18191A] rounded-lg border border-[#E4E6EB] dark:border-[#3E4042] outline-none focus:border-purple font-medium transition-all text-sm appearance-none cursor-pointer">
                 {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             )}

             <button type="submit" disabled={!title || !amount} className="w-full bg-purple text-white disabled:opacity-50 mt-2 px-4 py-3 rounded-lg font-bold hover:bg-opacity-90 active:scale-95 transition-all">Add Entry</button>
          </form>
        </div>

        <div className="md:col-span-2 space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white dark:bg-[#242526] rounded-lg p-6 shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] flex flex-col justify-center min-h-[200px]">
               <h3 className="font-bold uppercase text-xs tracking-widest text-slate-400 mb-4 flex items-center gap-2"><PieChartIcon size={16}/> Expense Breakdown</h3>
               {chartData.length > 0 ? (
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={chartData} innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                          {chartData.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(val: number) => `₱${val}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400 font-medium text-sm italic">No expenses yet</div>
               )}
             </div>
             
             <div className="bg-white dark:bg-[#242526] rounded-lg p-6 shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042] flex flex-col justify-center">
               <h3 className="font-bold uppercase text-xs tracking-widest text-slate-400 mb-4">Summary</h3>
               <div className="space-y-3">
                 {chartData.map((item, idx) => (
                   <div key={item.name} className="flex items-center justify-between">
                     <div className="flex items-center gap-2">
                       <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                       <span className="font-medium text-sm text-slate-800 dark:text-gray-200">{item.name}</span>
                     </div>
                     <span className="font-mono font-medium text-sm text-slate-600 dark:text-slate-400">₱{item.value.toLocaleString()}</span>
                   </div>
                 ))}
                 {chartData.length === 0 && <div className="text-slate-400 font-medium text-sm italic">Nothing to summarize</div>}
               </div>
             </div>
           </div>

           <div className="bg-white dark:bg-[#242526] rounded-lg p-6 shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042]">
             <h3 className="font-bold uppercase text-xs tracking-widest text-slate-400 mb-4 flex items-center gap-2"><TrendingUp size={16}/> Daily Cashflow</h3>
             <div className="h-48 w-full outline-none">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={dailyChartData}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E4E6EB" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} dy={10} />
                   <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} tickFormatter={(value) => `₱${value}`} width={55} />
                   <Tooltip 
                     cursor={{ fill: 'transparent' }}
                     contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                   />
                   <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px', fontWeight: 'bold' }} />
                   <Bar dataKey="Income" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={20} />
                   <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={20} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
           </div>

           <div className="bg-white dark:bg-[#242526] rounded-lg p-6 shadow-md shadow-slate-200/50 dark:shadow-none border border-slate-300 dark:border-[#3E4042]">
             <h3 className="font-bold uppercase text-xs tracking-widest text-slate-400 mb-4">Recent Transactions</h3>
             <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-none">
               <AnimatePresence mode="popLayout">
                 {items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0)).map(item => (
                    <motion.div
                       layout
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       key={item.id}
                       className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-[#18191A] border border-[#E4E6EB] dark:border-[#3E4042] rounded-lg group transition-all"
                    >
                       <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'income' ? 'bg-teal/10 text-teal' : 'bg-coral/10 text-coral'}`}>
                             {item.type === 'income' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                          </div>
                          <div className="flex flex-col">
                             <span className="font-bold">{item.title}</span>
                             <span className="text-xs font-bold uppercase text-slate-400">{item.category} • {item.date}</span>
                          </div>
                       </div>
                       <div className="flex items-center gap-3">
                         <span className={`text-lg font-black ${item.type === 'income' ? 'text-teal' : 'text-coral'}`}>
                            {item.type === 'income' ? '+' : '-'}₱{item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                         </span>
                         <button onClick={() => deleteItem(item.id)} className="opacity-0 group-hover:opacity-100 text-coral hover:bg-coral/10 p-2 rounded-lg transition-all">
                           <Trash2 size={16} />
                         </button>
                       </div>
                    </motion.div>
                 ))}
                 {items.length === 0 && (
                   <div className="text-center py-8 text-slate-400 font-bold italic">No transactions yet</div>
                 )}
               </AnimatePresence>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default BudgetPage;
