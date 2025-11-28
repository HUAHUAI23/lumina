import React from 'react';
import { NAVIGATION_ITEMS, APP_NAME } from '../constants';
import { NavigationPage } from '../types';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: NavigationPage) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  return (
    <aside className="w-20 lg:w-64 border-r border-zinc-800 bg-surface flex flex-col h-full transition-all duration-300">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <div className="w-4 h-4 bg-white rounded-full"></div>
        </div>
        <span className="font-bold text-xl text-white hidden lg:block tracking-tight">{APP_NAME}</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {NAVIGATION_ITEMS.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as NavigationPage)}
              className={`
                w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-zinc-800 text-white shadow-inner' 
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? 'text-indigo-400' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
              <span className="hidden lg:block font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="bg-zinc-900 rounded-xl p-4 hidden lg:block border border-zinc-800">
          {/* User Profile Info */}
          <div className="flex items-center gap-3 mb-4 border-b border-zinc-800 pb-3">
            <div className="relative">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" 
                alt="User Avatar" 
                className="w-8 h-8 rounded-full bg-zinc-800 object-cover"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-900 rounded-full"></div>
            </div>
            <div className="overflow-hidden">
               <p className="text-sm font-medium text-white truncate">Alex Creator</p>
               <p className="text-[10px] text-zinc-500 truncate uppercase tracking-wider">Early Access</p>
            </div>
          </div>

          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-semibold text-zinc-400">CREDITS</span>
            <span className="text-xs font-bold text-indigo-400">850 / 1000</span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-indigo-600 h-full w-[85%] rounded-full"></div>
          </div>
          <button 
             onClick={() => onNavigate('billing')}
             className="w-full mt-3 py-1.5 text-xs bg-white text-black rounded-lg font-semibold hover:bg-zinc-200 transition-colors"
          >
            Top Up
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;