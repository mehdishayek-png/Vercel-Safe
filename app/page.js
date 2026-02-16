'use client';

import { useState, useRef, useCallback } from 'react';

// ---- Country/Region data ----
const COUNTRY_REGIONS = {
  India: ['Any', 'Karnataka (Bangalore)', 'Maharashtra (Mumbai/Pune)', 'Delhi NCR', 'Telangana (Hyderabad)', 'Tamil Nadu (Chennai)', 'West Bengal (Kolkata)', 'Gujarat (Ahmedabad)', 'Uttar Pradesh', 'Rajasthan', 'Kerala', 'Punjab', 'Haryana (Gurgaon)'],
  'United States': ['Any', 'California', 'New York', 'Texas', 'Washington', 'Massachusetts', 'Illinois', 'Florida', 'Colorado', 'Georgia', 'Pennsylvania', 'Virginia'],
  'United Kingdom': ['Any', 'London', 'Manchester', 'Birmingham', 'Edinburgh', 'Bristol', 'Leeds'],
  Canada: ['Any', 'Ontario (Toronto)', 'British Columbia (Vancouver)', 'Quebec (Montreal)', 'Alberta (Calgary)'],
  Germany: ['Any', 'Berlin', 'Munich', 'Hamburg', 'Frankfurt'],
  Australia: ['Any', 'New South Wales (Sydney)', 'Victoria (Melbourne)', 'Queensland (Brisbane)'],
  UAE: ['Any', 'Dubai', 'Abu Dhabi'],
  Singapore: ['Any'],
  'Remote Only': ['Any'],
};
const COUNTRIES = Object.keys(COUNTRY_REGIONS);
const EXP_OPTIONS = ['0–1 years', '1–3 years', '3–6 years', '6–10 years', '10+ years'];

export default function Home() {
  // ---- State ----
  const [profile, setProfile] = useState({
    name: '', email: '', headline: '', experience: '3–6 years',
    skills: [], industry: '', search_terms: [],
    country: 'India', state: 'Any',
  });
  const [apiKeys, setApiKeys] = useState({ OPENROUTER_KEY: '', SERPAPI_KEY: '', JSEARCH_KEY: '' });
  const [matches, setMatches] = useState([]);
  const [totalJobs, setTotalJobs] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [progress, setProgress] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [sortBy, setSortBy] = useState('score');
  const [expandedJob, setExpandedJob] = useState(null);
  const [coverLetters, setCoverLetters] = useState({});
  const [generatingLetter, setGeneratingLetter] = useState(null);
  const [skillsText, setSkillsText] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  // ---- Helpers ----
  const updateProfile = (key, val) => setProfile(p => ({ ...p, [key]: val }));

  // ---- Parse resume ----
  const handleParseResume = async (file) => {
    if (!file || !apiKeys.OPENROUTER_KEY) return;
    setIsParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('apiKey', apiKeys.OPENROUTER_KEY);

      const res = await fetch('/api/parse-resume', { method: 'POST', body: formData });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      setProfile(prev => ({
        ...prev,
        ...data.profile,
        country: prev.country,
        state: prev.state,
        experience: prev.experience,
      }));
      setSkillsText((data.profile.skills || []).join('\n'));
      alert('Resume parsed successfully! Profile updated.');
    } catch (e) {
      alert(`Parse error: ${e.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  // ---- Run matching ----
  const handleSearch = async () => {
    const currentProfile = {
      ...profile,
      skills: skillsText.split('\n').map(s => s.trim()).filter(Boolean),
    };
    if (!currentProfile.skills.length) { alert('Please add skills first'); return; }

    setIsSearching(true);
    setProgress('Starting pipeline...');
    setProgressPct(5);
    setMatches([]);

    try {
      const res = await fetch('/api/match-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: currentProfile, apiKeys }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMatches(data.matches || []);
      setTotalJobs(data.total || 0);
      setProgress(`✅ ${data.matches?.length || 0} matches from ${data.total} jobs`);
      setProgressPct(100);
    } catch (e) {
      setProgress(`❌ Error: ${e.message}`);
    } finally {
      setIsSearching(false);
    }
  };

  // ---- Generate cover letter ----
  const handleGenerateLetter = async (job, idx) => {
    if (!apiKeys.OPENROUTER_KEY) return;
    setGeneratingLetter(idx);
    try {
      const res = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job,
          profile: { ...profile, skills: skillsText.split('\n').filter(Boolean) },
          apiKey: apiKeys.OPENROUTER_KEY,
        }),
      });
      const data = await res.json();
      if (data.letter) setCoverLetters(prev => ({ ...prev, [idx]: data.letter }));
    } catch { }
    finally { setGeneratingLetter(null); }
  };

  // ---- Sorted matches ----
  const sortedMatches = [...matches].sort((a, b) => {
    if (sortBy === 'score') return (b.match_score || 0) - (a.match_score || 0);
    return 0;
  });

  const regions = COUNTRY_REGIONS[profile.country] || ['Any'];

  // ---- File drop ----
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file?.type === 'application/pdf') handleParseResume(file);
  }, [apiKeys.OPENROUTER_KEY]);

  return (
    <div className="min-h-screen p-4 md:p-8 font-poppins">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">JobBot <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">AI</span></h1>
              <p className="text-sm text-gray-400">Your Intelligent Career Copilot</p>
            </div>
          </div>
          <div className="text-sm text-gray-400 bg-white/5 px-4 py-2 rounded-full border border-white/10">
            {profile.name ? `Welcome, ${profile.name}` : 'Ready to search'}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT PANEL - CONTROLS */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Resume Upload Card */}
            <div className="glass-panel p-6 rounded-2xl">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <span>📄</span> Upload Resume
              </h2>
              
              <div 
                className={`upload-zone-premium p-6 text-center cursor-pointer ${dragOver ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                </div>
                <p className="text-sm font-medium text-white mb-2">Click to Upload PDF</p>
                <p className="text-xs text-gray-400 mb-4">or drag and drop here</p>
                <button 
                  onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                  className="btn-primary w-full text-sm"
                  disabled={isParsing}
                >
                  {isParsing ? 'Parsing Resume...' : 'Select PDF File'}
                </button>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleParseResume(e.target.files[0])} />
              </div>
            </div>

            {/* Profile Settings */}
            <div className="glass-panel p-6 rounded-2xl">
              <h2 className="text-lg font-semibold mb-4 text-white">Profile Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Full Name</label>
                  <input className="input-premium" value={profile.name} onChange={e => updateProfile('name', e.target.value)} placeholder="Enter your name" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Headline</label>
                  <input className="input-premium" value={profile.headline} onChange={e => updateProfile('headline', e.target.value)} placeholder="Software Engineer, Product Manager..." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Experience</label>
                  <select className="input-premium" value={profile.experience} onChange={e => updateProfile('experience', e.target.value)}>
                    {EXP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Target Location</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select className="input-premium" value={profile.country} onChange={e => { updateProfile('country', e.target.value); updateProfile('state', 'Any'); }}>
                      {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="input-premium" value={profile.state} onChange={e => updateProfile('state', e.target.value)}>
                      {regions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Skills (Keywords)</label>
                  <textarea
                    rows={4}
                    className="input-premium font-mono text-sm"
                    value={skillsText}
                    onChange={e => setSkillsText(e.target.value)}
                    placeholder={'React\nNode.js\nPython\nProject Management'}
                  />
                </div>
              </div>

              {/* API Keys Toggle */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-purple-300 hover:text-purple-200 flex items-center gap-2">
                    <span>🔑</span> Configure API Keys
                  </summary>
                  <div className="space-y-3 mt-4 animate-slide-up">
                    <div>
                      <label className="text-xs text-gray-400">OpenRouter API Key (Required)</label>
                      <input type="password" className="input-premium text-sm" value={apiKeys.OPENROUTER_KEY} onChange={e => setApiKeys(k => ({ ...k, OPENROUTER_KEY: e.target.value }))} placeholder="sk-or-..." />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400">SerpAPI Key (Optional)</label>
                      <input type="password" className="input-premium text-sm" value={apiKeys.SERPAPI_KEY} onChange={e => setApiKeys(k => ({ ...k, SERPAPI_KEY: e.target.value }))} />
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL - RESULTS */}
          <div className="lg:col-span-8">
            <div className="glass-panel p-6 rounded-2xl min-h-[600px] flex flex-col">
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Job Matches</h2>
                  <p className="text-sm text-gray-400">Found {totalJobs} potential opportunities</p>
                </div>
                <div className="flex gap-3">
                  <select className="input-premium !w-auto text-sm" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                    <option value="score">Sort by Match %</option>
                    <option value="date">Sort by Date</option>
                  </select>
                  <button
                    className="btn-primary flex items-center gap-2"
                    onClick={handleSearch}
                    disabled={isSearching || !skillsText.trim()}
                  >
                    {isSearching ? <span className="animate-spin">🔄</span> : '🚀'}
                    {isSearching ? 'Searching...' : 'Find Jobs'}
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              {(isSearching || matches.length > 0) && (
                <div className="mb-6 bg-black/20 rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              )}

              {/* Results List */}
              <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {matches.length > 0 ? (
                  sortedMatches.map((job, idx) => {
                    const score = job.match_score || 0;
                    const isExpanded = expandedJob === idx;

                    return (
                      <div key={idx} className="job-card animate-slide-up" style={{ animationDelay: `${idx * 0.05}s` }} onClick={() => setExpandedJob(isExpanded ? null : idx)}>
                        <div className="flex items-start gap-4">
                          {/* Score Badge */}
                          <div className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl font-bold text-sm ${score >= 80 ? 'bg-green-500/20 text-green-300' : score >= 60 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-700 text-gray-400'}`}>
                            <span>{score}%</span>
                            <span className="text-[10px] opacity-60">MATCH</span>
                          </div>

                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white group-hover:text-purple-300 transition-colors">{job.title}</h3>
                            <div className="text-sm text-gray-400 mb-2">{job.company} • {job.location || 'Remote'}</div>
                            
                            <div className="flex flex-wrap gap-2">
                              {job.date_posted && <span className="text-xs bg-white/5 px-2 py-1 rounded border border-white/5">📅 {job.date_posted}</span>}
                              <span className="text-xs bg-white/5 px-2 py-1 rounded border border-white/5">🏷️ {job.source || 'Aggregator'}</span>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="mt-4 pt-4 border-t border-white/10 animate-slide-up">
                                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line mb-4">{job.summary}</p>
                                <div className="flex gap-3">
                                  {job.apply_url && (
                                    <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="btn-primary text-sm no-underline !px-6 !py-2">
                                      Apply Now
                                    </a>
                                  )}
                                  <button
                                    className="btn-secondary flex items-center gap-2"
                                    onClick={(e) => { e.stopPropagation(); handleGenerateLetter(job, idx); }}
                                    disabled={generatingLetter === idx}
                                  >
                                    {generatingLetter === idx ? '✍️ Writing...' : '📝 Generate Cover Letter'}
                                  </button>
                                </div>
                                {coverLetters[idx] && (
                                  <div className="mt-4 p-4 bg-black/20 rounded-xl border border-white/10 text-sm whitespace-pre-wrap font-mono text-gray-300">
                                    {coverLetters[idx]}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  !isSearching && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <div className="text-4xl mb-4">🔍</div>
                      <p>No jobs found yet. Try adjusting your search.</p>
                    </div>
                  )
                )}
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
