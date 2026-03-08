// Centralized match score color system — used by JobCard, MatchRing, MatchResultsGrid

export function getMatchColor(score) {
  if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-50', hex: '#10b981' };
  if (score >= 60) return { text: 'text-blue-600', bg: 'bg-blue-50', hex: '#3b82f6' };
  return { text: 'text-gray-400', bg: 'bg-gray-50', hex: '#9ca3af' };
}

export function getMatchGradient(score) {
  if (score >= 80) return 'from-emerald-500 to-teal-500';
  if (score >= 60) return 'from-indigo-500 to-purple-500';
  return 'from-slate-500 to-slate-600';
}
