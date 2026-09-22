import React from 'react';
import { FinanceProvider } from './context/FinanceContext';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <FinanceProvider>
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Dashboard />
        </main>
      </div>
    </FinanceProvider>
  );
}