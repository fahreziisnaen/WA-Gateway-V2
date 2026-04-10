import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  MessageCircle,
  LayoutDashboard,
  QrCode,
  Users,
  ScrollText,
  Wifi,
  WifiOff,
  Menu,
  X,
} from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';

const NAV = [
  { path: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/qr', label: 'QR Code', Icon: QrCode },
  { path: '/groups', label: 'Groups', Icon: Users },
  { path: '/logs', label: 'Logs', Icon: ScrollText },
];

export default function Layout({ children, status, socketConnected }) {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-wa-green rounded-xl flex items-center justify-center shadow-sm">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-tight">WA Gateway</p>
            <p className="text-[10px] text-gray-400 leading-tight">Admin Dashboard</p>
          </div>
        </div>
      </div>

      {/* Status summary */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <StatusBadge status={status.status} />
        {status.name && (
          <p className="text-xs text-gray-500 mt-1 truncate">{status.name}</p>
        )}
        {status.phone && (
          <p className="text-xs font-mono text-gray-400 truncate">+{status.phone}</p>
        )}
      </div>

      {/* Nav links */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ path, label, Icon }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-wa-green/10 text-wa-teal'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-wa-teal' : 'text-gray-400'}`} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {socketConnected
            ? <Wifi className="w-3 h-3 text-green-500" />
            : <WifiOff className="w-3 h-3 text-gray-400" />}
          <span>{socketConnected ? 'Live updates on' : 'Reconnecting…'}</span>
        </div>
        <p className="text-[10px] text-gray-300 mt-1">v1.0.0</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-gray-200 shadow-sm flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl z-50">
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="p-1 rounded-md text-gray-600">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-wa-green" />
            <span className="font-semibold text-gray-800">WA Gateway</span>
          </div>
          <StatusBadge status={status.status} />
        </div>

        {/* Page */}
        <main className="flex-1 overflow-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
