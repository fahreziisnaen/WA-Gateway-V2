import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Smartphone,
  Users,
  ScrollText,
  Settings,
  Wifi,
  WifiOff,
  Menu,
  LogOut,
  BookOpen,
  ShieldCheck,
} from 'lucide-react';
import StatusBadge from './StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import ForcePasswordChangeModal from './ForcePasswordChangeModal.jsx';

const NAV = [
  { path: '/', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/instances', label: 'Instances', Icon: Smartphone },
  { path: '/groups', label: 'Groups', Icon: Users },
  { path: '/logs', label: 'Logs', Icon: ScrollText },
  { path: '/audit', label: 'Audit', Icon: ShieldCheck },
  { path: '/docs', label: 'Docs', Icon: BookOpen },
  { path: '/settings', label: 'Settings', Icon: Settings },
];

export default function Layout({ children, instances = [], socketConnected }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const connectedCount = instances.filter((i) => i.status === 'connected').length;
  const overallStatus = connectedCount > 0 ? 'connected'
    : instances.some((i) => i.status === 'connecting') ? 'connecting'
      : 'disconnected';

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <img src="/philliplogo.jpg" alt="Phillip Securities" className="w-9 h-9 object-contain rounded-sm" />
          <div>
            <p className="font-bold text-gray-900 leading-tight text-sm">Phillip WA Gateway</p>
            <p className="text-[10px] text-gray-400 leading-tight">Phillip Securities HK Limited</p>
          </div>
        </div>
      </div>

      {/* Instance summary */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <StatusBadge status={overallStatus} />
          <span className="text-xs text-gray-400">
            {connectedCount}/{instances.length} connected
          </span>
        </div>
        {instances.slice(0, 3).map((inst) => (
          <div key={inst.id} className="flex items-center gap-1.5 mt-1">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${inst.status === 'connected' ? 'bg-green-500'
                : inst.status === 'connecting' ? 'bg-yellow-400'
                  : 'bg-gray-300'
              }`} />
            <span className="text-xs text-gray-500 truncate">{inst.name}</span>
            {inst.phone && (
              <span className="text-xs font-mono text-gray-400 ml-auto">+{inst.phone}</span>
            )}
          </div>
        ))}
        {instances.length > 3 && (
          <p className="text-xs text-gray-400 mt-1">+{instances.length - 3} more</p>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ path, label, Icon }) => {
          const active = pathname === path;
          return (
            <Link
              key={path}
              to={path}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${active
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
      <div className="border-t border-gray-100 p-3 space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-400 px-1">
          {socketConnected
            ? <Wifi className="w-3 h-3 text-green-500" />
            : <WifiOff className="w-3 h-3 text-gray-400" />}
          <span>{socketConnected ? 'Live updates on' : 'Reconnecting…'}</span>
        </div>
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-[10px] font-bold text-gray-600 flex-shrink-0">
              {user?.username?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <span className="text-xs text-gray-600 truncate">{user?.username}</span>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex w-60 flex-col bg-white border-r border-gray-200 shadow-sm flex-shrink-0">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl z-50">
            <Sidebar />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <button onClick={() => setMobileOpen(true)} className="p-1 rounded-md text-gray-600">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/philliplogo.jpg" alt="Phillip Securities" className="w-6 h-6 object-contain rounded-sm" />
            <span className="font-semibold text-gray-800">Phillip WA Gateway</span>
          </div>
          <StatusBadge status={overallStatus} />
        </div>
        <main className="flex-1 overflow-auto p-6 md:p-8">{children}</main>
      </div>

      <ForcePasswordChangeModal />
    </div>
  );
}
