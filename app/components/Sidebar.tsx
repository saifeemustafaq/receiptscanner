'use client';

import React from 'react';
import { Home, FileText, ShoppingBag, Settings as SettingsIcon } from 'lucide-react';

interface SidebarProps {
  currentView: 'home' | 'items' | 'history' | 'settings';
  onNavigate: (view: 'home' | 'items' | 'history' | 'settings') => void;
  isOpen?: boolean;
}

export default function Sidebar({ currentView, onNavigate, isOpen = true }: SidebarProps) {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        Receipt Scanner
      </div>
      
      <nav className="sidebar-nav">
        <button
          className={`nav-item ${currentView === 'home' ? 'active' : ''}`}
          onClick={() => onNavigate('home')}
        >
          <Home size={20} />
          <span>Home</span>
        </button>
        
        <button
          className={`nav-item ${currentView === 'items' ? 'active' : ''}`}
          onClick={() => onNavigate('items')}
        >
          <ShoppingBag size={20} />
          <span>Items</span>
        </button>
        
        <button
          className={`nav-item ${currentView === 'history' ? 'active' : ''}`}
          onClick={() => onNavigate('history')}
        >
          <FileText size={20} />
          <span>Receipt History</span>
        </button>
        
        <button
          className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          <SettingsIcon size={20} />
          <span>Settings</span>
        </button>
      </nav>
    </aside>
  );
}

