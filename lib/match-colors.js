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

export function getMatchBadge(score) {
  if (score >= 85) return { label: 'Strong Match', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
  if (score >= 70) return { label: 'Good Match', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
  if (score >= 55) return { label: 'Fair Match', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
  return { label: 'Weak Match', bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200', dot: 'bg-gray-400' };
}
