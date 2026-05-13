import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy } from 'firebase/firestore';
import { JournalEntry } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, Edit3, Save, X, Smile, Frown, Meh, Search, Tag, Book, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import Markdown from 'react-markdown';

export default function Journal() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  
  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile layout state
  const [showMobileList, setShowMobileList] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to journal entries
    const q = query(
      collection(db, 'journal'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as JournalEntry));
      
      setEntries(data);
      if (data.length > 0 && !activeEntryId && window.innerWidth >= 768) {
        setActiveEntryId(data[0].id);
      }
    });
    
    return () => unsubscribe();
  }, [user]);

  // Update editor state when active entry changes
  useEffect(() => {
    if (activeEntryId) {
      const entry = entries.find(e => e.id === activeEntryId);
      if (entry) {
        setContent(entry.content);
        setMood(entry.mood);
        setTags(entry.tags || []);
        setIsEditing(false);
      }
    } else {
      setContent('');
      setMood(null);
      setTags([]);
      setIsEditing(false);
    }
  }, [activeEntryId, entries]);

  const handleCreateNew = () => {
    setActiveEntryId(null);
    setContent('');
    setMood(null);
    setTags([]);
    setIsEditing(true);
    setShowMobileList(false);
  };

  const handleSelectEntry = (id: string) => {
    setActiveEntryId(id);
    setIsEditing(false);
    setShowMobileList(false);
  };

  const handleBackToList = () => {
    setShowMobileList(true);
    if (!activeEntryId && !isEditing) return;
    // Don't reset active entry immediately to prevent flicker, but it's okay for now.
  };

  const handleSave = async () => {
    if (!user || !content.trim()) return;
    
    try {
      if (activeEntryId) {
        // Update existing
        await updateDoc(doc(db, 'journal', activeEntryId), {
          content,
          mood,
          tags,
          updatedAt: serverTimestamp()
        });
      } else {
        // Create new
        const newDocRef = await addDoc(collection(db, 'journal'), {
          userId: user.uid,
          content,
          mood,
          tags,
          date: format(new Date(), 'yyyy-MM-dd'),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setActiveEntryId(newDocRef.id);
      }
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving entry:", error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this entry?')) return;
    
    try {
      await deleteDoc(doc(db, 'journal', id));
      if (activeEntryId === id) {
        setActiveEntryId(entries.length > 0 ? entries[0].id : null);
        if (entries.length <= 1) {
          setShowMobileList(true);
        }
      }
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  };

  const addTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() && tags.length < 10) {
      e.preventDefault();
      setTags([...tags, tagInput.trim().toLowerCase()]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const filteredEntries = entries.filter(e => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return e.content.toLowerCase().includes(lowerQuery) || 
           (e.tags && e.tags.some(t => t.toLowerCase().includes(lowerQuery)));
  });

  const moods = [
    { value: 'great', icon: Smile, color: 'text-emerald-500' },
    { value: 'good', icon: Smile, color: 'text-teal-500' },
    { value: 'neutral', icon: Meh, color: 'text-slate-500' },
    { value: 'bad', icon: Frown, color: 'text-orange-500' },
    { value: 'awful', icon: Frown, color: 'text-coral' }
  ];

  return (
    <div className="flex flex-col md:flex-row bg-white dark:bg-[#242526] rounded-2xl shadow-sm border border-slate-200 dark:border-[#3E4042] h-[85vh] overflow-hidden">
      
      {/* Sidebar List */}
      <div className={`w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-200 dark:border-[#3E4042] flex-col bg-slate-50 dark:bg-[#18191A] ${!showMobileList ? 'hidden md:flex' : 'flex'} h-full md:h-auto`}>
        <div className="p-4 border-b border-slate-200 dark:border-[#3E4042] shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Book size={20} className="text-teal" />
              Journal
            </h2>
            <button 
              onClick={handleCreateNew}
              className="p-2 bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="relative">
            <input 
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-[#242526] border border-slate-300 dark:border-[#3E4042] rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-teal transition-colors"
            />
            <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto w-full">
          {filteredEntries.map(entry => {
            const entryDate = entry.createdAt?.toDate ? entry.createdAt.toDate() : new Date();
            const isActive = activeEntryId === entry.id;
            
            return (
              <div 
                key={entry.id}
                onClick={() => handleSelectEntry(entry.id)}
                className={`w-full p-4 border-b border-slate-200 dark:border-[#3E4042] cursor-pointer transition-colors ${
                  isActive ? 'bg-white dark:bg-[#242526] border-l-4 border-l-teal' : 'hover:bg-slate-100 dark:hover:bg-[#202122] border-l-4 border-l-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {format(entryDate, 'MMM d, yyyy')}
                  </span>
                  <button 
                    onClick={(e) => handleDelete(entry.id, e)}
                    className="text-slate-400 hover:text-coral transition-colors p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="text-sm font-medium line-clamp-2 text-slate-800 dark:text-gray-100 mb-2">
                  {entry.content || "Empty entry..."}
                </p>
                <div className="flex flex-wrap gap-1">
                  {entry.tags?.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] bg-slate-200 dark:bg-[#3E4042] px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                      #{tag}
                    </span>
                  ))}
                  {entry.tags && entry.tags.length > 3 && (
                    <span className="text-[10px] bg-slate-200 dark:bg-[#3E4042] px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                      +{entry.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
          {filteredEntries.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-sm">
              No entries found.
            </div>
          )}
        </div>
      </div>

      {/* Editor / Viewer Area */}
      <div className={`flex-1 flex-col bg-white dark:bg-[#242526] ${showMobileList ? 'hidden md:flex' : 'flex'} h-full md:h-auto`}>
        {activeEntryId || isEditing ? (
          <>
            {/* Toolbar */}
            <div className="h-16 border-b border-slate-200 dark:border-[#3E4042] flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-[#242526] shrink-0 overflow-x-auto">
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <button 
                  onClick={handleBackToList}
                  className="md:hidden p-1.5 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-[#3E4042] rounded-lg transition-colors"
                >
                  <ArrowLeft size={20} />
                </button>
                
                <span className="text-sm font-medium text-slate-500 hidden sm:inline-block">
                  {isEditing ? 'Editing' : 'Viewing'}
                </span>
                
                {/* Mood Selector */}
                {(isEditing || mood) && (
                  <div className="flex items-center gap-1 sm:border-l border-slate-300 dark:border-[#3E4042] sm:pl-4 shrink-0 ml-2 sm:ml-0">
                    {isEditing ? (
                      moods.map(m => {
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.value}
                            onClick={() => setMood(m.value)}
                            className={`p-1.5 rounded-full transition-all ${mood === m.value ? 'bg-slate-100 dark:bg-[#3E4042] ' + m.color : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                            title={m.value}
                          >
                            <Icon size={18} />
                          </button>
                        );
                      })
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-slate-50 dark:bg-[#18191A]">
                        {moods.find(m => m.value === mood)?.icon && React.createElement(moods.find(m => m.value === mood)!.icon, { size: 16, className: moods.find(m => m.value === mood)!.color })}
                        <span className="text-xs font-medium capitalize text-slate-600 dark:text-slate-300">{mood}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0 ml-4">
                {isEditing ? (
                  <>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-[#3E4042] rounded-lg transition-colors flex items-center gap-1 sm:gap-2"
                    >
                      <X size={16} /><span className="hidden sm:inline">Cancel</span>
                    </button>
                    <button 
                      onClick={handleSave}
                      className="px-4 py-1.5 text-sm font-bold bg-teal text-white rounded-lg hover:bg-teal/90 transition-colors flex items-center gap-1 sm:gap-2 shadow-sm"
                    >
                      <Save size={16} /><span className="hidden sm:inline">Save</span>
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-1.5 text-sm font-medium bg-slate-100 dark:bg-[#3E4042] hover:bg-slate-200 dark:hover:bg-[#4E5052] rounded-lg transition-colors flex items-center gap-1 sm:gap-2"
                  >
                    <Edit3 size={16} /><span className="hidden sm:inline">Edit</span>
                  </button>
                )}
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8">
              {isEditing ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="What's on your mind? (Supports Markdown)"
                  className="w-full h-full min-h-[300px] resize-none outline-none bg-transparent text-slate-800 dark:text-gray-100 text-base sm:text-lg leading-relaxed placeholder:text-slate-400"
                />
              ) : (
                <div className="prose prose-slate dark:prose-invert max-w-none text-slate-800 dark:text-gray-100 markdown-body">
                  <Markdown>{content || '*Empty entry*'}</Markdown>
                </div>
              )}
            </div>

            {/* Bottom Toolbar (Tags) */}
            <div className="p-4 border-t border-slate-200 dark:border-[#3E4042] bg-slate-50 dark:bg-[#18191A] flex flex-wrap items-center gap-2 shrink-0">
              <Tag size={16} className="text-slate-400 hidden sm:block" />
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-sm bg-white dark:bg-[#242526] border border-slate-300 dark:border-[#3E4042] px-2 py-1 rounded shadow-sm">
                  #{tag}
                  {isEditing && (
                    <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-coral p-0.5">
                      <X size={12} />
                    </button>
                  )}
                </span>
              ))}
              {isEditing && (
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={addTag}
                  placeholder="Add tag and press Enter..."
                  className="bg-transparent border-none outline-none text-sm w-full sm:w-48 placeholder:text-slate-400 mt-2 sm:mt-0"
                />
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6">
            <Book size={48} className="mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2 text-slate-600 dark:text-slate-300 text-center">Your Personal Journal</h3>
            <p className="text-sm mb-6 max-w-sm text-center">Capture your thoughts, ideas, and daily reflections entirely in markdown.</p>
            <button 
              onClick={handleCreateNew}
              className="px-6 py-2 bg-teal text-white font-bold rounded-xl hover:bg-opacity-90 transition-all shadow-sm flex items-center gap-2"
            >
              <Plus size={18} /> Start Writing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
