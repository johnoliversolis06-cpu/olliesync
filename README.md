# OllieSync 
A vibrant, personal development application featuring activity tracking, Pomodoro focus, habits, and budget management.

##  Overview
OllieSync is designed to be your all-in-one personal dashboard for productivity and positive living. It helps you track tasks, maintain good habits, manage your finances, and stay focused using the Pomodoro technique—all wrapped in a fast, responsive, and animated UI.

##  Key Features
- **Dashboard**: A bird's-eye view of your day, showing pending tasks, upcoming habits, and financial summaries.
- **Tasks**: Create, edit, and track your daily activities and to-dos.
- **Focus**: A built-in Pomodoro timer to help you work in focused chunks (e.g., 25 minutes work, 5 minutes rest).
- **Habits**: Build and maintain positive routines with a visual streak tracker.
- **Budget**: Track your expenses and income to maintain a healthy financial lifestyle.
- **Analytics**: Visualize your progress over time with interactive charts.
- **Dark/Light Mode**: Full theme customization to suit your preference.
- **Authentication**: Secure Google Sign-In powered by Firebase.

##  Tech Stack
This application is built with modern web technologies:
- **Core**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS 4, Framer Motion (animations)
- **Routing**: React Router
- **Database & Auth**: Firebase (Cloud Firestore & Firebase Authentication)
- **Data Visualization**: Recharts
- **Icons**: Lucide React
- **Forms & Validation**: `react-hook-form` and `zod`

---

##  Local Development Setup

If you want to run this app locally on your own machine, follow these steps:

### 1. Prerequisites
- Install **Node.js** (v18 or higher recommended)
- A **Firebase** Account (https://console.firebase.google.com/)

### 2. Clone and Install dependencies
If you haven't already, download the project files and open them in your terminal:
```bash
# Install all required npm packages
npm install
```

### 3. Firebase Configuration
Since the app uses Firebase, you need to connect it to your Firebase project:
1. Go to the Firebase Console and create a new project.
2. Enable **Firestore Database** (start in Test mode or configure security rules).
3. Enable **Authentication** and turn on the **Google** sign-in provider.
   *Note: Ensure "localhost" is added to the "Authorized domains" list in Firebase Auth settings.*
4. Go to Project Settings -> General -> add a Web App to get your Firebase configuration.
5. Create a file named `.env` in the root folder of this project and add your Firebase config variables (refer to `.env.example` if it exists, or update `src/lib/firebase.ts` with your actual config).

### 4. Run the Development Server
```bash
npm run dev
```
Open your browser and navigate to `http://localhost:3000`.

---

##  Publishing & Hosting

Since your backend is already on Firebase, the easiest way to host your frontend is using **Firebase Hosting**:

1. Install the Firebase CLI globally:
   ```bash
   npm install -g firebase-tools
   ```
2. Log into Firebase via terminal:
   ```bash
   firebase login
   ```
3. Initialize Firebase in your project folder:
   ```bash
   firebase init hosting
   ```
   - **Select** your existing project.
   - **What do you want to use as your public directory?** Type `dist` (this is very important for Vite).
   - **Configure as a single-page app?** Type `y` (Yes).
   - **Set up automatic builds and deploys with GitHub?** `n` (No, for now).
   - If it asks to overwrite `index.html`, type `n` (No).

4. Build the application:
   ```bash
   npm run build
   ```

5. Deploy:
   ```bash
   firebase deploy --only hosting
   ```



*(Alternatively, you can easily host this code on services like Vercel or Netlify by importing your GitHub repository and setting the build command to `npm run build` and publish directory to `dist`.)*
