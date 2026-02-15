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
    <div className="min-h-screen p-2 md:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-[var(--stroke)] bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-lg">🔎</div>
          <span className="text-lg font-extrabold">JobBot</span>
        </div>
        <div className="w-10 h-10 rounded-full border border-[var(--stroke)] bg-[rgba(255,255,255,0.06)] flex items-center justify-center text-sm">👤</div>
      </div>

      {/* Main layout */}
      <div className="flex gap-4 flex-col lg:flex-row">
        {/* LEFT PANEL */}
        <div className="lg:w-[30%] w-full">
          <div className="panel">
            <div className="p-4">
              {/* Tabs */}
              <div className="tab-bar mb-4">
                <div className="tab-item active">My Profile</div>
                <div className="tab-item">Tailor CV</div>
              </div>

              {/* Upload */}
              <div
                className={`upload-zone mb-4 ${dragOver ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <div className="w-14 h-14 mx-auto mb-3 rounded-xl border-2 border-[rgba(255,255,255,0.25)] flex items-center justify-center">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-6Z" stroke="rgba(255,255,255,0.55)" strokeWidth="2"/><path d="M14 2v6h6" stroke="rgba(255,255,255,0.55)" strokeWidth="2"/></svg>
                </div>
                <div className="font-extrabold text-sm">{isParsing ? 'Parsing...' : 'Upload Resume (PDF)'}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted-2)' }}>Drop file or click to browse</div>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={(e) => e.target.files?.[0] && handleParseResume(e.target.files[0])} />
              </div>

              {/* Profile form */}
              <div className="bezel p-3 mb-4">
                <div className="space-y-3">
                  <div>
                    <label>Name</label>
                    <input value={profile.name} onChange={e => updateProfile('name', e.target.value)} placeholder="Your name" />
                  </div>
                  <div>
                    <label>Email</label>
                    <input value={profile.email} onChange={e => updateProfile('email', e.target.value)} placeholder="you@example.com" />
                  </div>
                  <div>
                    <label>Professional Headline</label>
                    <input value={profile.headline} onChange={e => updateProfile('headline', e.target.value)} placeholder="e.g. Business Operations Lead" />
                  </div>
                  <div>
                    <label>Years of Experience</label>
                    <select value={profile.experience} onChange={e => updateProfile('experience', e.target.value)}>
                      {EXP_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Skills / Search Terms (one per line)</label>
                    <textarea
                      rows={5}
                      value={skillsText}
                      onChange={e => setSkillsText(e.target.value)}
                      placeholder="payment operations&#10;fintech&#10;merchant onboarding&#10;API integration"
                    />
                  </div>
                </div>
              </div>

              {/* Job preferences */}
              <div className="tab-bar mb-3">
                <div className="tab-item active">Job Preferences</div>
              </div>

              <div className="space-y-3">
                <div>
                  <label>Country</label>
                  <select value={profile.country} onChange={e => { updateProfile('country', e.target.value); updateProfile('state', 'Any'); }}>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label>City / Region</label>
                  <select value={profile.state} onChange={e => updateProfile('state', e.target.value)}>
                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* API Keys */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-bold" style={{ color: 'var(--muted)' }}>🔑 API Keys</summary>
                <div className="space-y-2 mt-2">
                  <div>
                    <label className="text-xs">OpenRouter API Key *</label>
                    <input type="password" value={apiKeys.OPENROUTER_KEY} onChange={e => setApiKeys(k => ({ ...k, OPENROUTER_KEY: e.target.value }))} placeholder="sk-or-..." />
                  </div>
                  <div>
                    <label className="text-xs">SerpAPI Key (optional)</label>
                    <input type="password" value={apiKeys.SERPAPI_KEY} onChange={e => setApiKeys(k => ({ ...k, SERPAPI_KEY: e.target.value }))} placeholder="SerpAPI key" />
                  </div>
                  <div>
                    <label className="text-xs">RapidAPI / JSearch (optional)</label>
                    <input type="password" value={apiKeys.JSEARCH_KEY} onChange={e => setApiKeys(k => ({ ...k, JSEARCH_KEY: e.target.value }))} placeholder="RapidAPI key" />
                  </div>
                </div>
              </details>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="lg:w-[70%] w-full">
          <div className="panel">
            <div className="bezel-big p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-extrabold">Compiled Jobs According To Profile</h2>
                <button
                  className="btn-gradient px-6 py-3 text-sm"
                  onClick={handleSearch}
                  disabled={isSearching || !skillsText.trim()}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>

              {/* Progress */}
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1" style={{ color: 'var(--muted-2)' }}>
                  <span className="font-extrabold">Compiled {matches.length}/{totalJobs || '—'}</span>
                  {sortedMatches.length > 0 && (
                    <select
                      className="text-xs !p-1 !w-auto !border-0 !bg-transparent"
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                    >
                      <option value="score">Highest match %</option>
                      <option value="date">Latest posted</option>
                    </select>
                  )}
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${progressPct}%` }} />
                </div>
                {progress && <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>{progress}</div>}
              </div>

              {/* Results */}
              <div className="space-y-3">
                {sortedMatches.length > 0 ? sortedMatches.map((job, idx) => {
                  const score = job.match_score || 0;
                  const isExpanded = expandedJob === idx;

                  return (
                    <div key={idx} className="animate-slide-up" style={{ animationDelay: `${idx * 0.03}s` }}>
                      <div className="flex gap-3 items-start">
                        <div className="flex-1">
                          <div
                            className="job-card"
                            onClick={() => setExpandedJob(isExpanded ? null : idx)}
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-[0.95rem]">{job.title}</span>
                              <span className="score-pill">{score}%</span>
                            </div>
                            <div className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
                              {[job.company, job.location].filter(Boolean).join(' · ')}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="bezel p-4 mt-1 animate-slide-up">
                              <div className="font-extrabold mb-1">{job.title}</div>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-sm" style={{ color: 'var(--muted)' }}>{job.company}</span>
                                <span className="badge">{(job.source || 'SOURCE').toUpperCase()}</span>
                              </div>
                              <div className="flex gap-4 text-sm mb-3 flex-wrap" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                {job.location && <span>📍 {job.location}</span>}
                                {job.date_posted && <span>📅 {job.date_posted}</span>}
                              </div>
                              {job.summary && (
                                <div className="text-sm leading-relaxed mb-3 desc-clamp" style={{ color: 'rgba(255,255,255,0.78)' }}>
                                  {job.summary}
                                </div>
                              )}
                              <div className="flex gap-2 flex-wrap">
                                {job.apply_url && (
                                  <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="btn-gradient px-4 py-2 text-xs inline-block no-underline">
                                    Apply →
                                  </a>
                                )}
                                <button
                                  className="px-4 py-2 text-xs rounded-xl border border-[var(--stroke)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] transition"
                                  onClick={(e) => { e.stopPropagation(); handleGenerateLetter(job, idx); }}
                                  disabled={generatingLetter === idx}
                                >
                                  {generatingLetter === idx ? '✍️ Writing...' : '📝 Cover Letter'}
                                </button>
                              </div>
                              {coverLetters[idx] && (
                                <div className="mt-3 p-3 rounded-xl border border-[var(--stroke)] bg-[rgba(255,255,255,0.02)] text-sm whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.8)' }}>
                                  {coverLetters[idx]}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex-shrink-0 w-20">
                          {job.apply_url ? (
                            <a href={job.apply_url} target="_blank" rel="noopener noreferrer" className="btn-gradient w-full py-2.5 text-xs text-center block no-underline">
                              Apply
                            </a>
                          ) : (
                            <button disabled className="btn-gradient w-full py-2.5 text-xs opacity-40 cursor-not-allowed">Apply</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  // Empty slots
                  Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="slot" />
                  ))
                )}
              </div>

              {/* Actions */}
              {matches.length > 0 && (
                <div className="mt-4">
                  <button
                    className="text-xs px-4 py-2 rounded-xl border border-[var(--stroke)] bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.08)] transition"
                    onClick={() => { setMatches([]); setTotalJobs(0); setProgress(''); setProgressPct(0); }}
                  >
                    Clear Results
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
