import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Create from './pages/Create';
import Billing from './pages/Billing';
import { NavigationPage } from './types';

function App() {
  const [currentPage, setCurrentPage] = useState<NavigationPage>('dashboard');

  // Simple hash router
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      if (hash && ['dashboard', 'create', 'assets', 'billing', 'settings'].includes(hash)) {
        setCurrentPage(hash as NavigationPage);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange(); // Initial check

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const navigate = (page: NavigationPage) => {
    window.location.hash = page;
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={navigate} />;
      case 'create':
        return <Create />;
      case 'billing':
        return <Billing />;
      default:
        // Placeholder for other pages
        return (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <div className="text-center">
               <h2 className="text-2xl font-bold text-white mb-2">Coming Soon</h2>
               <p>{currentPage.charAt(0).toUpperCase() + currentPage.slice(1)} is under construction.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen bg-background text-white font-sans selection:bg-indigo-500/30">
      <Sidebar currentPage={currentPage} onNavigate={navigate} />
      
      <main className="flex-1 h-full overflow-y-auto overflow-x-hidden relative">
        {/* Top Header Area (Mobile only or simplified) */}
        <div className="lg:hidden p-4 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur z-50">
           <span className="font-bold">Lumina</span>
           <div className="text-xs bg-zinc-800 px-2 py-1 rounded">850 Credits</div>
        </div>

        {renderPage()}
      </main>
    </div>
  );
}

export default App;
