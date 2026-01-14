
# Wedding Seating Planner 💍

A smart, interactive application for optimizing wedding seating arrangements. Built with React, TypeScript, and Tailwind CSS.

## ✨ Features

- **Excel Import**: Easily import guest lists from Excel/CSV files.
- **Smart Grouping**: Automatically groups guests by family, friends, or custom categories.
- **Advanced Seating Algorithm**: 
  - **"Best Fit Decreasing"**: Optimizes table filling to avoid empty seats.
  - **Knight Tables**: Supports designated long tables for specific groups (e.g., "Friends").
  - **Group Splitting**: Intelligently splits large groups to fill gaps without creating oversized tables.
- **Interactive Dashboard**: Drag-and-drop interface, real-time statistics, and conflict alerts.
- **Excel Export**: Export the final seating plan with table numbers and phone numbers for easy distribution.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Data Processing**: XLSX (SheetJS)

## 🚀 Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/yourusername/wedding-seating-planner.git
    cd wedding-seating-planner
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  Open `http://localhost:5173` in your browser.

## 📝 Usage

1.  **Import**: Upload your guest list Excel file. Map the columns (Name, Category, Side, etc.).
2.  **Configure**: Set your standard table capacity (e.g., 12).
3.  **Optimize**: Click "Optimize" to run the algorithm. You can choose to set up Knight Tables for specific 
4.  **Refine**: Drag and drop guests to make manual adjustments if needed.
5.  **Export**: Download the final plan to Excel.

## 📄 License

MIT
