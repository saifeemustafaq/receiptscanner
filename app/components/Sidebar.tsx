'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, FileText, ShoppingBag, BarChart3, Settings as SettingsIcon } from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const handleClick = () => {
    if (onClose) onClose();
  };

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-logo">
        Receipt Scanner
      </div>
      
      <nav className="sidebar-nav">
        <Link 
          href="/" 
          className={`nav-item ${isActive('/') && !pathname.includes('/items') && !pathname.includes('/history') && !pathname.includes('/settings') && !pathname.includes('/insights') ? 'active' : ''}`}
          onClick={handleClick}
        >
          <Home size={20} />
          <span>Home</span>
        </Link>
        
        <Link 
          href="/items" 
          className={`nav-item ${isActive('/items') ? 'active' : ''}`}
          onClick={handleClick}
        >
          <ShoppingBag size={20} />
          <span>Items</span>
        </Link>

        <Link 
          href="/insights" 
          className={`nav-item ${isActive('/insights') ? 'active' : ''}`}
          onClick={handleClick}
        >
          <BarChart3 size={20} />
          <span>Insights</span>
        </Link>
        
        <Link 
          href="/history" 
          className={`nav-item ${isActive('/history') ? 'active' : ''}`}
          onClick={handleClick}
        >
          <FileText size={20} />
          <span>Receipt History</span>
        </Link>
        
        <Link 
          href="/settings" 
          className={`nav-item ${isActive('/settings') ? 'active' : ''}`}
          onClick={handleClick}
        >
          <SettingsIcon size={20} />
          <span>Settings</span>
        </Link>
      </nav>
    </aside>
  );
}
