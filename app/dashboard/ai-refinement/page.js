'use client';
import { useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Zap, TrendingUp, Sparkles, Eye } from 'lucide-react';

const SLIDER_CONFIG = [
    {
        category: 'Risk & Hierarchy',
        items: [
            { id: 'risk', label: 'Risk Appetite', left: 'Conservative', right: 'Aggressive' },
            { id: 'seniority', label: 'Role Seniority', left: 'Contributor', right: 'Executive' },
        ],
    },
    {
        category: 'Focus & Environment',
        items: [
            { id: 'focus', label: 'Focus Equilibrium', left: 'Technical Depth', right: 'Strategic Leadership' },
            { id: 'culture', label: 'Culture Velocity', left: 'Established / Stable', right: 'Disruptive / Scaling' },
        ],
    },
];

const VALUE_LABELS = {
    risk: (v) => v > 65 ? 'AGGRESSIVE' : v > 35 ? 'CALCULATED' : 'CONSERVATIVE',
    seniority: (v) => v > 75 ? 'EXECUTIVE' : v > 50 ? 'VP / HEAD OF' : v > 25 ? 'SENIOR' : 'MID-LEVEL',
    focus: (v) => v > 65 ? 'LEADERSHIP HEAVY' : v > 35 ? 'BALANCED' : 'TECHNICAL DEPTH',
    culture: (v) => v > 65 ? 'HYPER-GROWTH' : v > 35 ? 'GROWTH-STAGE' : 'ENTERPRISE',
};

const INSIGHT_ICONS = { TrendingUp, Sparkles, Eye };

function NeuralSlider({ item, value, onChange }) {
    const label = VALUE_LABELS[item.id]?.(value) || '';
    return (
        <div className="py-5">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">{item.label}</h3>
                <span className="text-sm font-extrabold tracking-wide text-brand-600 dark:text-brand-400 font-headline">
                    {label}
                </span>
            </div>
            <input
                type="range" min="0" max="100" value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700 accent-brand-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600 [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:shadow-brand-600/30 [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between mt-2">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{item.left}</span>
                <span className="text-[11px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">{item.right}</span>
            </div>
        </div>
    );
}

export default function AIRefinementPage() {
    const { profile, neuralProfile, setNeuralProfile } = useApp();
    const [sliderValues, setSliderValues] = useState(neuralProfile?.sliderValues || { risk: 45, seniority: 70, focus: 55, culture: 75 });
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(null);

    const ecosystemScore = neuralProfile?.ecosystemScore || 0;
    const insights = neuralProfile?.insights || [];
    const topMatch = neuralProfile?.topMatch || null;

    const handleCommit = useCallback(async () => {
        setIsSyncing(true);
        setSyncError(null);
        try {
            const res = await fetch('/api/neural-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sliderValues, profile }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Sync failed');
            }
            const data = await res.json();
            setNeuralProfile({
                sliderValues: data.sliderValues,
                ecosystemScore: data.ecosystemScore,
                insights: data.insights,
                topMatch: data.topMatch,
            });
        } catch (err) {
            setSyncError(err.message);
        } finally {
            setIsSyncing(false);
        }
    }, [sliderValues, profile, setNeuralProfile]);

    const handleReset = () => {
        const defaults = { risk: 45, seniority: 70, focus: 55, culture: 75 };
        setSliderValues(defaults);
    };

    return (
        <div className="max-w-[1100px] space-y-6">
            <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase bg-brand-50 text-brand-600 dark:bg-brand-900/30 dark:text-brand-400 border border-brand-100 dark:border-brand-800/30 mb-3">
                    AI Neural Core
                </span>
                <h1 className="font-headline text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                    AI Neural Profile <span className="italic text-brand-600 dark:text-brand-400">Refinement.</span>
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-2xl leading-relaxed">
                    Tune the intelligence that powers your matches. Use the neural controllers below to recalibrate how the Midas Engine prioritizes your career trajectory.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr,340px] gap-6">
                {/* Left Column - Sliders */}
                <div className="space-y-6">
                    {SLIDER_CONFIG.map((section) => (
                        <div key={section.category} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 md:p-8 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-2 h-2 rounded-full bg-brand-600" />
                                <span className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">{section.category}</span>
                            </div>
                            <div className="divide-y divide-slate-100 dark:divide-[#2d3140]">
                                {section.items.map((item) => (
                                    <NeuralSlider
                                        key={item.id}
                                        item={item}
                                        value={sliderValues[item.id]}
                                        onChange={(val) => setSliderValues(prev => ({ ...prev, [item.id]: val }))}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}

                    {syncError && (
                        <p className="text-sm text-red-500 px-1">{syncError}</p>
                    )}

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleCommit}
                            disabled={isSyncing}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-bold transition-colors shadow-md shadow-brand-600/20 font-headline cursor-pointer disabled:opacity-60"
                        >
                            {isSyncing ? 'Syncing...' : 'Commit Neural State'}
                            <Zap className="w-4 h-4" />
                        </button>
                        <button
                            onClick={handleReset}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-[#22252f] text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2d3140] rounded-xl text-sm font-bold transition-colors cursor-pointer"
                        >
                            Reset Defaults
                        </button>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                    {/* Ecosystem Score */}
                    <div className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 font-headline">Match Projection</h2>
                            <span className="flex items-center gap-1.5 text-[10px] font-bold text-brand-600">
                                <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                                {isSyncing ? 'SYNCING' : 'ACTIVE'}
                            </span>
                        </div>
                        <div className="bg-gray-50 dark:bg-[#13151d] rounded-xl p-6 text-center">
                            <span className="text-6xl font-extrabold text-gray-900 dark:text-white font-headline">{ecosystemScore || '—'}</span>
                            {ecosystemScore > 0 && <span className="text-2xl font-bold text-gray-400">%</span>}
                            <p className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mt-2">Ecosystem Fit Score</p>
                        </div>
                        {ecosystemScore === 0 && (
                            <p className="text-xs text-gray-400 text-center mt-3">Commit your neural state to calculate your score</p>
                        )}
                    </div>

                    {/* Insights */}
                    {insights.length > 0 && (
                        <div className="space-y-3">
                            {insights.map((insight, i) => {
                                const icons = [TrendingUp, Sparkles, Eye];
                                const Icon = icons[i % icons.length];
                                return (
                                    <div key={i} className="bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] p-5 shadow-sm">
                                        <div className="flex gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center shrink-0">
                                                <Icon className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">{insight.title}</h3>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{insight.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Top Match Card */}
                    {topMatch && (
                        <div className="bg-gradient-to-br from-brand-600 to-secondary-DEFAULT rounded-2xl p-6 text-white shadow-lg">
                            <span className="text-[9px] font-bold tracking-[0.2em] uppercase text-white/70">Top Match Now</span>
                            <h3 className="text-lg font-extrabold mt-2 font-headline">{topMatch.title} @ {topMatch.company}</h3>
                            <div className="flex items-center gap-2 mt-3">
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/20">{topMatch.stage}</span>
                                <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-white/20">{topMatch.salary}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
