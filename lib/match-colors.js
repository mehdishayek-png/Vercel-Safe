// Centralized match score color system — used by JobCard, MatchRing, MatchResultsGrid

export function getMatchColor(score) {
  if (score >= 80) return { text: 'text-emerald-600', bg: 'bg-emerald-50', hex: '#059669', border: 'border-emerald-200' };
  if (score >= 60) return { text: 'text-brand-600', bg: 'bg-brand-50', hex: '#4f46e5', border: 'border-brand-200' };
  if (score >= 40) return { text: 'text-amber-600', bg: 'bg-amber-50', hex: '#d97706', border: 'border-amber-200' };
  return { text: 'text-gray-400', bg: 'bg-gray-50', hex: '#9ca3af', border: 'border-gray-200' };
}

export function getMatchGradient(score) {
  if (score >= 80) return 'from-emerald-500 to-teal-500';
  if (score >= 60) return 'from-brand-500 to-accent-500';
  if (score >= 40) return 'from-amber-500 to-orange-500';
  return 'from-gray-400 to-gray-500';
}
