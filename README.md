# Tracker Pro

A minimalist, high-performance Time and Expense tracker built with modern web technologies. featuring a premium dark mode, smart inputs, and secure cloud persistence.

## 🚀 Features

-   **Time Tracking**: Smart inputs (Supports "9am to 5pm"), automatic duration calculation, and 24h sorting.
-   **Expense Tracking**: Quick logging with category auto-complete.
-   **Dashboard**: Daily views, Weekly/Monthly summaries, and Calendar navigation.
-   **Data Export**: Download your data as CSV compatible with Excel/Google Sheets (Yearly, Monthly, or Custom Range).
-   **Secure**: Authentication and Row Level Security via Supabase.
-   **Design**: Beautiful Shadcn-ui inspired Dark Mode.

## 🛠️ Tech Stack

-   **Frontend**: React (Vite)
-   ** styling**: Tailwind CSS
-   **Icons**: Lucide React
-   **Date Logic**: date-fns
-   **Backend**: Supabase (Auth + Database)

## 📂 Project Structure

```
src/
├── components/         # UI Components and Views
│   ├── ui/            # Reusable UI primitives (Button, Input, Card)
│   ├── Auth.jsx       # Login/Signup Logic
│   ├── DayDetailView.jsx   # Main tracking interface
│   ├── CalendarView.jsx    # Monthly grid view
│   ├── SummaryView.jsx     # Stats aggregation view
│   └── ExportDialog.jsx    # CSV Export Logic
├── lib/
│   ├── supabase.js    # Client initialization
│   └── utils.js       # Helper functions
└── App.jsx            # Main routing and global state
```

## ⚡ Setup

1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/tracking-app.git
    cd tracking-app
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Variables**
    Create a `.env` file:
    ```env
    VITE_SUPABASE_URL=your_project_url
    VITE_SUPABASE_KEY=your_anon_key
    ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```

5.  **Build**
    ```bash
    npm run build
    ```

## 🗄️ Database Schema

The app requires two tables in Supabase: `entries` and `saved_options`. Run the SQL commands in your Supabase SQL Editor to set them up with RLS policies.
