import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Wifi, WifiOff, Loader2, Phone, User, Smartphone, ArrowRight, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Dashboard({ instances = [] }) {
  const connectedCount = instances.filter((i) => i.status === 'connected').length;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Instances" value={instances.length} color="text-gray-900" />
        <StatCard label="Connected" value={connectedCount} color="text-green-600" />
        <StatCard
          label="Offline"
          value={instances.length - connectedCount}
          color={instances.length - connectedCount > 0 ? 'text-red-500' : 'text-gray-400'}
        />
      </div>

      {/* Instance cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">WhatsApp Instances</h2>
          <Link
            to="/instances"
            className="text-xs text-wa-teal hover:underline flex items-center gap-1"
          >
            Manage <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        {instances.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
            <Smartphone className="w-10 h-10 mx-auto text-gray-200 mb-3" />
            <p className="text-sm text-gray-500">No instances yet.</p>
            <Link
              to="/instances"
              className="inline-block mt-2 text-sm font-medium text-wa-teal hover:underline"
            >
              Add your first WhatsApp →
            </Link>
          </div>
        )}

        <div className="space-y-3">
          {instances.map((inst) => (
            <div
              key={inst.id}
              className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div
                className={`px-5 py-3 flex items-center gap-3 border-b border-gray-100 ${
                  inst.status === 'connected' ? 'bg-green-50'
                  : inst.status === 'connecting' ? 'bg-yellow-50'
                  : 'bg-gray-50'
                }`}
              >
                {inst.status === 'connected'
                  ? <Wifi className="w-4 h-4 text-green-600" />
                  : inst.status === 'connecting'
                  ? <Loader2 className="w-4 h-4 text-yellow-600 animate-spin" />
                  : <WifiOff className="w-4 h-4 text-gray-400" />}
                <span className="font-medium text-gray-800 text-sm">{inst.name}</span>
                <code className="text-xs text-gray-400 bg-white/60 px-1.5 py-0.5 rounded ml-1">
                  {inst.id}
                </code>
                <div className="ml-auto">
                  <StatusBadge status={inst.status} />
                </div>
              </div>
              <div className="divide-y divide-gray-50">
                <Row
                  icon={<Phone className="w-3.5 h-3.5 text-gray-400" />}
                  label="Phone"
                  value={inst.phone ? `+${inst.phone}` : '—'}
                  mono
                />
                <Row
                  icon={<User className="w-3.5 h-3.5 text-gray-400" />}
                  label="Name"
                  value={inst.waName ?? '—'}
                />
              </div>
              {inst.status !== 'connected' && (
                <div className="px-5 py-2.5 bg-gray-50 border-t border-gray-100">
                  <Link
                    to="/instances"
                    className="text-xs text-wa-teal hover:underline"
                  >
                    → Scan QR to connect
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Docs link */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800 text-sm">Need Help?</p>
          <p className="text-xs text-gray-500 mt-0.5">Check out the documentation to learn how to connect your app.</p>
        </div>
        <Link to="/docs" className="text-sm font-medium text-wa-teal hover:underline px-3 py-1.5 bg-wa-green/10 rounded-lg transition-colors">
          View Docs
        </Link>
      </div>
    </div>
  );
}

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group">
      <pre className="bg-gray-900 text-gray-100 rounded-lg px-3 py-2.5 text-[11px] overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
        {code}
      </pre>
      <button
        onClick={copy}
        className="absolute top-2 right-2 p-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors opacity-0 group-hover:opacity-100"
        title="Copy"
      >
        {copied
          ? <Check className="w-3 h-3 text-green-400" />
          : <Copy className="w-3 h-3 text-gray-300" />}
      </button>
    </div>
  );
}

function CodeLine({ label, code }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-amber-600 font-medium w-20 shrink-0">{label}</span>
      <code className="text-[11px] font-mono bg-white border border-amber-200 px-2 py-0.5 rounded text-amber-900">
        {code}
      </code>
    </div>
  );
}

function FieldRow({ name, type, required, desc }) {
  return (
    <div className="flex gap-3 text-xs">
      <div className="shrink-0 w-20">
        <code className="font-mono font-semibold text-gray-800 bg-gray-100 px-1.5 py-0.5 rounded">
          {name}
        </code>
      </div>
      <div className="flex items-start gap-2 min-w-0">
        <span className="text-gray-400 shrink-0">{type}</span>
        {required
          ? <span className="text-red-500 text-[10px] font-semibold shrink-0">required</span>
          : <span className="text-gray-400 text-[10px] shrink-0">optional</span>}
        <span className="text-gray-500 leading-relaxed">{desc}</span>
      </div>
    </div>
  );
}

function Row({ icon, label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <span className="text-xs text-gray-500 flex items-center gap-1.5">
        {icon}{label}
      </span>
      <span className={`text-xs text-gray-800 ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
