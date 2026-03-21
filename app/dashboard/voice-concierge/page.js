'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Mic, MicOff, Pause, Keyboard, Save, Download, Target, BookOpen, TrendingUp } from 'lucide-react';
import Link from 'next/link';

function AudioVisualizer({ isActive }) {
    const bars = 5;
    return (
        <div className="relative w-48 h-48 md:w-56 md:h-56 mx-auto">
            <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                isActive
                    ? 'bg-gradient-to-br from-brand-600/20 to-secondary-DEFAULT/20 shadow-[0_0_60px_rgba(79,70,229,0.3)]'
                    : 'bg-gradient-to-br from-brand-600/10 to-secondary-DEFAULT/10'
            }`} />
            <div className={`absolute inset-6 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 dark:from-[#1a1d27] dark:to-[#13151d] shadow-2xl flex items-center justify-center transition-all duration-300 ${
                isActive ? 'scale-100' : 'scale-95'
            }`}>
                <div className="flex items-end gap-1.5 h-12">
                    {[...Array(bars)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-1.5 rounded-full bg-white/80 transition-all duration-150 ${isActive ? 'animate-pulse' : ''}`}
                            style={{
                                height: isActive ? `${20 + Math.sin(Date.now() / 200 + i * 0.5) * 20}px` : '8px',
                                animationDelay: `${i * 100}ms`,
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

function ChatMessage({ message }) {
    const isUser = message.role === 'user';
    return (
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
            <span className="text-[9px] font-bold tracking-[0.15em] text-gray-400 uppercase mb-2">
                {isUser ? 'You' : 'Concierge'}
            </span>
            <div className={`max-w-[90%] px-5 py-4 rounded-2xl text-sm leading-relaxed ${
                isUser
                    ? 'bg-brand-600 text-white rounded-br-md'
                    : 'bg-gray-100 dark:bg-[#22252f] text-gray-800 dark:text-gray-200 rounded-bl-md border border-slate-200/60 dark:border-[#2d3140]'
            }`}>
                {message.text}
                {message.actions && message.actions.length > 0 && (
                    <div className="flex gap-2 mt-3">
                        {message.actions.map((action, i) => (
                            <Link
                                key={i}
                                href={action.href}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-brand-600/20 text-brand-600 dark:text-brand-400 rounded-lg text-xs font-semibold hover:bg-brand-600/30 transition-colors"
                            >
                                {action.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

const INSIGHT_ICONS = { signal: Target, prep: BookOpen, market: TrendingUp };

export default function VoiceConciergePage() {
    const { profile, savedJobsData, appliedJobsData } = useApp();
    const [isListening, setIsListening] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'concierge',
            text: profile
                ? `Good morning, ${profile.name?.split(' ')[0] || 'there'}. I've been monitoring your pipeline. What would you like to discuss — skill gaps, interview prep, or pipeline strategy?`
                : "Welcome! Upload your resume on the search page first, then come back and I can help with career strategy, interview prep, and more.",
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [insights, setInsights] = useState([]);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages]);

    const sendMessage = useCallback(async (text) => {
        if (!text.trim()) return;
        const userMsg = { role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        setIsTyping(true);

        try {
            const res = await fetch('/api/voice-concierge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: text,
                    profile,
                    savedJobs: savedJobsData,
                    appliedJobs: appliedJobsData,
                    conversationHistory: messages.slice(-6),
                }),
            });

            if (!res.ok) throw new Error('Failed to get response');
            const data = await res.json();

            setMessages(prev => [...prev, {
                role: 'concierge',
                text: data.response,
                actions: data.suggestedActions || [],
            }]);

            if (data.insights) setInsights(data.insights);
        } catch {
            setMessages(prev => [...prev, {
                role: 'concierge',
                text: "I'm having trouble connecting right now. Try again in a moment.",
            }]);
        } finally {
            setIsTyping(false);
        }
    }, [profile, savedJobsData, appliedJobsData, messages]);

    const handleSendMessage = () => sendMessage(inputText);

    return (
        <div className="max-w-[1100px] space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6 min-h-[calc(100vh-180px)]">
                {/* Left Column - Voice Interface */}
                <div className="flex flex-col">
                    <div className="flex-1 flex flex-col items-center justify-center py-8">
                        <AudioVisualizer isActive={isListening && !isPaused} />
                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 font-headline mt-8 text-center">
                            {isListening ? 'Listening for your aspirations...' : 'Paused'}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center max-w-md">
                            Type below or use quick prompts to discuss career strategy with your AI concierge.
                        </p>

                        {/* Quick Prompts */}
                        <div className="flex flex-wrap justify-center gap-2 mt-6">
                            {['What are my skill gaps?', 'Help me prepare for interviews', 'Pipeline status', 'Salary negotiation tips'].map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => sendMessage(prompt)}
                                    disabled={isTyping}
                                    className="px-3 py-1.5 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3140] rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:border-brand-300 hover:text-brand-600 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-4 mt-8">
                            <button
                                onClick={() => setShowKeyboard(!showKeyboard)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                    showKeyboard ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600' : 'bg-gray-100 dark:bg-[#22252f] text-gray-500 hover:bg-gray-200 dark:hover:bg-[#2d3140]'
                                }`}
                            >
                                <Keyboard className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setIsListening(!isListening)}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                                    isListening ? 'bg-brand-600 text-white shadow-brand-600/30 hover:bg-brand-700' : 'bg-gray-200 dark:bg-[#22252f] text-gray-500 hover:bg-gray-300'
                                }`}
                            >
                                {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                            </button>
                            <button
                                onClick={() => setIsPaused(!isPaused)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                    isPaused ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'bg-gray-100 dark:bg-[#22252f] text-gray-500 hover:bg-gray-200 dark:hover:bg-[#2d3140]'
                                }`}
                            >
                                <Pause className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Text Input */}
                        {showKeyboard && (
                            <div className="w-full max-w-lg mt-6">
                                <div className="flex gap-2">
                                    <input
                                        type="text" value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Type your message..."
                                        className="flex-1 px-4 py-3 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3140] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={isTyping || !inputText.trim()}
                                        className="px-4 py-3 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-4 py-4 border-t border-slate-100 dark:border-[#2d3140]">
                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3140] rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-brand-300 transition-colors cursor-pointer">
                            <Save className="w-3.5 h-3.5" /> Save Discussion
                        </button>
                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3140] rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-brand-300 transition-colors cursor-pointer">
                            <Download className="w-3.5 h-3.5" /> Export Insights
                        </button>
                    </div>
                </div>

                {/* Right Column - Transcript + Insights */}
                <div className="flex flex-col bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-[#2d3140] flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Live Transcript</span>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /> Live
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5 max-h-[400px]">
                        {messages.map((msg, i) => (
                            <ChatMessage key={i} message={msg} />
                        ))}
                        {isTyping && (
                            <div className="flex items-center gap-1 px-4 py-2">
                                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Contextual Insights */}
                    {insights.length > 0 && (
                        <div className="border-t border-slate-100 dark:border-[#2d3140] px-5 py-4">
                            <span className="text-[9px] font-bold tracking-[0.15em] text-brand-600 uppercase">Contextual Insights</span>
                            <div className="mt-3 space-y-3">
                                {insights.map((insight, i) => {
                                    const Icon = INSIGHT_ICONS[insight.type] || Target;
                                    const colorMap = {
                                        signal: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
                                        market: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
                                        prep: 'text-brand-600 bg-brand-50 dark:bg-brand-900/20',
                                    };
                                    return (
                                        <div key={i} className="flex gap-3">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${colorMap[insight.type] || 'text-brand-600 bg-brand-50'}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">{insight.title}</h4>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{insight.description}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
