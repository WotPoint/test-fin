// Shared Recharts styles that adapt to the current CSS theme variables
export const chartTooltipStyle = {
  contentStyle: {
    background: 'var(--bg-card)',
    border: '1px solid var(--bg-border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: 12,
    boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
  },
  labelStyle: { color: 'var(--text-secondary)' },
  cursor: { fill: 'var(--bg-hover)' },
};

export const chartGridColor = 'var(--bg-border)';
export const chartAxisTick = { fill: 'var(--text-secondary)', fontSize: 10 };
