export type UserProfile = {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  theme: 'light' | 'dark';
  focusInterval: number;
  breakInterval: number;
  autoCutoffDuration: number; // minutes
  createdAt: any;
};

export type Habit = {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  notes?: string;
  habitType?: 'positive' | 'negative' | 'both';
  difficulty?: 'easy' | 'medium' | 'hard';
  createdAt: any;
  archived: boolean;
};

export type Task = {
  id: string;
  userId: string;
  title: string;
  completed: boolean;
  category: string;
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'anytime';
  notes?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  createdAt: any;
  completedAt?: any;
};

export type Log = {
  id: string;
  userId: string;
  entityId: string;
  type: 'habit' | 'task';
  date: string; // YYYY-MM-DD
  timeSpent: number; // seconds
  completed: boolean;
  timestamp: any;
};

export type BudgetItem = {
  id: string;
  userId: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  createdAt: any;
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
