/**
 * Export job matches to CSV and trigger download.
 */
export function exportJobsToCSV(jobs, filename = 'midas-matches.csv') {
    if (!jobs || jobs.length === 0) return;

    const headers = ['Title', 'Company', 'Location', 'Score', 'AI Score', 'Posted', 'Source', 'Salary Estimate', 'AI Verdict', 'Apply URL'];

    const escapeCSV = (val) => {
        if (val == null) return '';
        const str = String(val).replace(/"/g, '""');
        return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    };

    const rows = jobs.map(job => [
        escapeCSV(job.title),
        escapeCSV(job.company),
        escapeCSV(job.location),
        job.match_score || '',
        job.analysis?.fit_score || '',
        escapeCSV(job.date_posted || ''),
        escapeCSV(job.source || ''),
        escapeCSV(job.analysis?.salary_estimate || ''),
        escapeCSV(job.analysis?.verdict || ''),
        escapeCSV(job.apply_url || ''),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}
