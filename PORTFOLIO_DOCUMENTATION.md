# OllieSync: Activity & Productivity Tracker Documentation

This detailed documentation outlines the core modules, architectural decisions, and technical implementations behind **OllieSync**. This is designed to serve as a reference guide for portfolio presentations.

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [UI & Styling Guidelines](#2-ui--styling-guidelines)
3. [Timer Module (Pomodoro & Freestyle)](#3-timer-module)
4. [Habit Tracking Module](#4-habit-tracking-module)
5. [Task Management](#5-task-management)
6. [Journal System](#6-journal-system)
7. [Analytics Formula](#7-analytics-formula)
8. [AI Integrations](#8-ai-integrations)

---

## 1. Architecture Overview
OllieSync is built as a highly responsive Single Page Application (SPA), utilizing a robust frontend framework paired with a flexible NoSQL serverless database.

* **Frontend Framework:** React 18+ constructed with Vite, utilizing Functional Components and Hooks.
* **Backend Substrate:** Google Firebase (Authentication & Firestore) providing near real-time state synchronization, secure data storage, and serverless queries.
* **Routing:** `react-router-dom` for handling view transitions.
* **State Management:** Compound Component Pattern using React Context API (`TimerContext` and `AuthContext`), preventing excessive prop drilling and centralizing complex business logic.

---

## 2. UI & Styling Guidelines
The application's interface emphasizes absolute focus, clarity, and intentional interactions.

* **Framework:** Tailwind CSS for low-level utility class styling.
* **Color Palette Strategy:**
    * **Primary Accents:** `teal` (productivity, focus, tasks), `purple` (consistency, habits), `coral` (interruption, destructive actions).
    * **Surfaces:** Clean `white` to soft `slate-50` for light mode, deep `#18191A` to `#242526` for dark mode, creating strict depth boundaries without relying entirely on borders.
* **Typography:** `Inter` font family representing a clean, highly legible UI.
* **Animation Engine:** `framer-motion` handles the layout transitions, staggered entrances, and micro-interactions (e.g., ticking timer scale logic).
* **Iconography:** `lucide-react` for consistent, SVG-based line iconography.

---

## 3. Timer Module
The Timer serves as the operational heart of the workspace, designed with advanced session tracking and entity binding. 

### Architecture (`TimerContext.tsx` & `Focus.tsx`)
It operates under a global Context Provider (`TimerProvider`), allowing a timer session to theoretically tick throughout the component tree without losing state upon unmounts, though the views represent it locally in `/focus`.

**Core Logic:**
* **Modes:** Inherits two independent modes: `pomodoro` (countdown based) and `freestyle` (count-up based).
* **Entity Binding:** Before starting a timer, users can optionally bind an "Entity" (a Task or a Habit ID).
* **Tick Engine:** Utilizing `setInterval`, we record timestamps (e.g., `Date.now()`) to calculate elapsed time structurally, mitigating drift latency common in `setInterval` rendering loops. 
* **Inactivity Guard:** A global event listener resets standard inactivity variables on keypress or mouse movement. If inactivity crosses the customizable `autoCutoffDuration`, the timer drops gracefully to prevent artificial logging.
* **Session Persistence:** When `handleComplete` is fired, a structured session dictionary is created and pushed onto Firestore's `logs` collection containing:
    * `userId`
    * `entityId` & `type` (task or habit) 
    * `timeSpent` (exact seconds elapsed)
    * `date` (ISO date string format)

---

## 4. Habit Tracking Module
Providing daily consistency structures utilizing visual heatmaps and "Smart Sort" implementations.

### Mechanics (`Habits.tsx`)
* **State Binding:** Queries active habits linked to the user account merged alongside the daily historical `logs`.
* **"Smart" Sort Algorithm:**
  1. Priority given to uncompleted habits for the current calendar day (`todayStr`).
  2. Fallback secondary array sort by alphabetical title.
  3. Additional sorting scopes fallback to `newest` and `oldest` based on `createdAt` timestamp milliseconds.
* **14-Day Heatmaps:** Generating visual accountability arrays. The code derives the previous 14 UTC days, maps over the specific Habit `logs`, and returns shaded indicators depending on completion metrics.
* **Streaks Engine:** Iterates consecutively backward from today’s index to calculate continuous un-broken chains (`getStreak`), applying a fiery visual cue depending on intensity.
* **Library Extensibility:** Employs a pre-defined library template structure, allowing rapid adoption of "good patterns" vs "custom habits".

---

## 5. Task Management
Built for frictionless entry and prioritization.

* **Schema:** Follows basic schema patterns (`title`, `completed`, `priority`).
* **Visual Rendering:** Layout utilizes Framer Motion’s `layout` and `<AnimatePresence>` to create seamless, organic shifts in the interface when checking off tasks (DOM nodes animating physically in and out of flow rather than jarringly disappearing).
* **Direct Handshake to Focus:** Each task possesses a "Play" node which pushes navigation state `/focus` alongside the task entity payload—pre-configuring the timer context.

---

## 6. Journal System
An introspective journaling platform blending deep markdown flexibility with tagging filters.

### Mechanics (`Journal.tsx`)
* **Text Engine:** Fully adopts `react-markdown` and `@tailwindcss/typography` (`prose`). By isolating read view vs. write view, the application prevents messy WYSIWYG implementations in favor of markdown.
* **Metadata Extraction:** 
    * Titles: Abstracted dynamically into separate state fields.
    * Mood Tracker & Tags: Utilizing standard NoSQL structured arrays pushing direct indices matching into Firestore.
* **List to Detail Relationship:** For mobile responsiveness, structural CSS hides the sidebar dynamically when entering entry contexts. 

---

## 7. Analytics Formula
The heart of the application's accountability metrics structure. The data is pulled raw from Firestore collections to synthesize user performance via `Dashboard.tsx`.

* **Focus Time Calculation:** 
   ```typescript
   let totalMins = 0;
   logsSnap.forEach(d => { totalMins += d.data().timeSpent / 60; });
   ```
   Takes the entire span of `timeSpent` parameters retrieved from the logs collection schema and dynamically aggregates it to calculate gross operational hours per user payload.
* **Remaining vs Completed Density:** Compares queries of `tasks` mapped by boolean value `completed: true/false`.
* **Real-time Subscribing:** All components rely on `onSnapshot`, ensuring that analytics metrics adjust globally without page reloads regardless of where the modification takes place on the client.

---

## 8. AI Integrations
The application blends seamlessly with Google’s Gemini API, producing lightweight psychological positive reinforcements.

* **Wisdom Engine:** Calls `generateQuote()` upon initializing the Dashboard, returning a personalized insight string.
* **Reward Mechanism:** The timer module's `TimerContext` runs a final AI network request via `getRewardSuggestion` returning a context-aware motivational phrase string based explicitly on the `taskName` completed.
