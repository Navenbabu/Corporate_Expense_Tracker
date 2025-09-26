Corporate Expense Tracker - MongoDB Atlas Implementation
MVP Implementation Plan

1. Backend API Setup (Node.js + Express + MongoDB)
server/server.js - Main server file with MongoDB Atlas connection
server/models/ - Mongoose models (User, Expense, Category)
server/routes/ - API routes (auth, expenses, users)
server/middleware/ - Authentication middleware
server/config/ - Database configuration

2. Frontend Components (React + TypeScript)
src/contexts/AuthContext.tsx - Authentication state management
src/contexts/ExpenseContext.tsx - Expense CRUD operations
src/pages/Dashboard.tsx - Role-based dashboard
src/pages/expenses/ExpenseList.tsx - Expense listing with filters
src/pages/expenses/ExpenseForm.tsx - Create/edit expense form
src/pages/auth/Login.tsx - Login with demo accounts
src/components/layouts/MainLayout.tsx - Main app layout

3. Key Features Implementation
JWT Authentication with role-based access
CRUD operations for expenses
Approval workflow (Employee → Manager → Admin)
Real-time notifications
Export functionality (CSV, PDF)
File upload for receipts

4. Database Schema
Users collection (role, department, manager hierarchy)
Expenses collection (status workflow, approval chain)
Categories collection (predefined expense types)

5. Integration Points
MongoDB Atlas connection string
JWT token management
File storage (local/cloud)
API error handling

File Structure
/workspace/shadcn-ui/
├── server/                 # Backend API
├── src/                   # Frontend React app
├── public/               # Static assets
└── package.json         # Dependencies