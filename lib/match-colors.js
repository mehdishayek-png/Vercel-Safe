// Centralized match score color system — used by JobCard, MatchRing, MatchResultsGrid

export function getMatchColor(score) {
  if (score >= 80) return { text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', hex: '#059669', border: 'border-emerald-200 dark:border-emerald-800' };
  if (score >= 60) return { text: 'text-brand-600 dark:text-brand-400', bg: 'bg-brand-50 dark:bg-brand-900/20', hex: '#C8962E', border: 'border-brand-200 dark:border-brand-800' };
  if (score >= 40) return { text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', hex: '#d97706', border: 'border-amber-200 dark:border-amber-800' };
  return { text: 'text-ink-400', bg: 'bg-ink-50 dark:bg-ink-900', hex: '#A8A29E', border: 'border-ink-200 dark:border-ink-800' };
}

export function getMatchGradient(score) {
  if (score >= 80) return 'from-emerald-500 to-teal-500';
  if (score >= 60) return 'from-brand-500 to-brand-600';
  if (score >= 40) return 'from-amber-500 to-orange-500';
  return 'from-ink-400 to-ink-500';
}
