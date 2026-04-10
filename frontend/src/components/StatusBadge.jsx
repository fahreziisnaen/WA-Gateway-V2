import React from 'react';

const VARIANTS = {
  connected: {
    dot: 'bg-green-500 animate-pulse',
    badge: 'bg-green-100 text-green-700 border-green-200',
    label: 'Connected',
  },
  connecting: {
    dot: 'bg-yellow-400 animate-pulse',
    badge: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    label: 'Connecting…',
  },
  disconnected: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-700 border-red-200',
    label: 'Disconnected',
  },
};

/**
 * @param {{ status: 'connected'|'connecting'|'disconnected', size?: 'sm'|'md' }} props
 */
export default function StatusBadge({ status, size = 'sm' }) {
  const v = VARIANTS[status] ?? VARIANTS.disconnected;
  const text = size === 'md' ? 'text-sm' : 'text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium px-2 py-0.5 rounded-full border ${text} ${v.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
      {v.label}
    </span>
  );
}
