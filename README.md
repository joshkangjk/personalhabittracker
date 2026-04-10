🗓️ Personal Habit Tracker
A modern, responsive habit-tracking web application built to help users build consistency and visualize their progress. This project leverages React 19 for the frontend and Supabase for real-time data persistence.

✨ Features
Daily Logging: Check off habits with a streamlined daily interface.

Progress Visualization: Data-driven insights using Recharts to monitor streaks and completion rates.

Customizable Habits: Add, edit, and categorize habits with support for specific frequencies.

PWA Ready: Built with vite-plugin-pwa for an app-like experience on mobile and desktop.

Accessible UI: Built using Radix UI primitives for high-quality, accessible components like dialogs, switches, and tabs.

Responsive Design: Fully responsive layout styled with Tailwind CSS.

🚀 Tech Stack
Frontend: React 19, Vite

Styling: Tailwind CSS, Lucide React (Icons)

UI Components: Radix UI, Class Variance Authority

Backend/Database: Supabase

Charts: Recharts

Date Management: date-fns

🛠️ Getting Started
Prerequisites
Node.js (Latest LTS recommended)

npm or yarn

Installation
Clone the repository:

Bash
git clone https://github.com/joshkangjk/personalhabittracker.git
cd personalhabittracker
Install dependencies:

Bash
npm install
Set up Environment Variables:
Create a .env file in the root directory and add your Supabase credentials:

Code snippet
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
Run the development server:

Bash
npm run dev
📦 Available Scripts
npm run dev: Runs the app in development mode with HMR.

npm run build: Builds the app for production to the dist folder.

npm run lint: Runs ESLint to find and fix code issues.

npm run preview: Locally previews the production build.