import React from 'react';
import { Layout, Server, Database, Code, Settings, Shield } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  setView: (view: 'endpoints' | 'upstream' | 'mapper' | 'security' | 'generate') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setView }) => {
  const menuItems = [
    { id: 'endpoints', label: 'Public Endpoints', icon: Layout },
    { id: 'upstream', label: 'Upstream APIs', icon: Server },
    { id: 'mapper', label: 'Data Mapping', icon: Database },
    { id: 'security', label: 'Security (JWT)', icon: Shield },
    { id: 'generate', label: 'Generate Code', icon: Code },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-full border-r border-slate-700 shadow-xl">
      <div className="p-6 border-b border-slate-700">
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
          BFF Studio
        </h1>
        <p className="text-xs text-slate-400 mt-1">Backend for Frontend Builder</p>
      </div>
      <nav className="flex-1 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id as any)}
              className={`w-full flex items-center gap-3 px-6 py-3 transition-colors duration-200 ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border-r-2 border-blue-400'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          <Settings size={14} />
          <span>v1.0.0</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;