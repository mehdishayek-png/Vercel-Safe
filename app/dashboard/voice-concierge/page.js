'use client';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Mic, MicOff, Pause, Keyboard, Save, Download, Target, BookOpen, TrendingUp, Sparkles } from 'lucide-react';

const INITIAL_MESSAGES = [
    {
        role: 'concierge',
        text: "Good morning, James. I've processed your recent applications. Should we look at preparing for the Lead Design interview at FintechFlow?",
    },
    {
        role: 'user',
        text: "Yes, definitely. But first, can you tell me if there are any specific technical skill gaps for that role?",
    },
    {
        role: 'concierge',
        text: "Analyzing... I noticed they emphasize real-time data visualization frameworks. You have experience with D3, but they use proprietary WebGL layers.",
    },
];

const CONTEXTUAL_INSIGHTS = [
    {
        icon: Target,
        title: 'Skill Gap Identified',
        description: 'WebGL rendering pipelines - recommend completing the advanced course before interview.',
        color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/20',
    },
    {
        icon: TrendingUp,
        title: 'Market Signal',
        description: 'FintechFlow just raised Series B - hiring velocity increased 40% this quarter.',
        color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
        icon: BookOpen,
        title: 'Prep Resource',
        description: 'System Design interview patterns most commonly asked at FintechFlow.',
        color: 'text-brand-600 bg-brand-50 dark:bg-brand-900/20',
    },
];

function AudioVisualizer({ isActive }) {
    const bars = 5;
    return (
        <div className="relative w-48 h-48 md:w-56 md:h-56 mx-auto">
            {/* Outer glow */}
            <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
                isActive
                    ? 'bg-gradient-to-br from-brand-600/20 to-secondary-DEFAULT/20 shadow-[0_0_60px_rgba(79,70,229,0.3)]'
                    : 'bg-gradient-to-br from-brand-600/10 to-secondary-DEFAULT/10'
            }`} />
            {/* Inner circle */}
            <div className={`absolute inset-6 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 dark:from-[#1a1d27] dark:to-[#13151d] shadow-2xl flex items-center justify-center transition-all duration-300 ${
                isActive ? 'scale-100' : 'scale-95'
            }`}>
                {/* Audio bars */}
                <div className="flex items-end gap-1.5 h-12">
                    {[...Array(bars)].map((_, i) => (
                        <div
                            key={i}
                            className={`w-1.5 rounded-full bg-white/80 transition-all duration-150 ${
                                isActive ? 'animate-pulse' : ''
                            }`}
                            style={{
                                height: isActive
                                    ? `${20 + Math.sin(Date.now() / 200 + i * 0.5) * 20}px`
                                    : '8px',
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
            </div>
        </div>
    );
}

export default function VoiceConciergePage() {
    const { profile } = useApp();
    const [isListening, setIsListening] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [inputText, setInputText] = useState('');
    const [showKeyboard, setShowKeyboard] = useState(false);
    const [isTyping, setIsTyping] = useState(true);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = () => {
        if (!inputText.trim()) return;
        setMessages(prev => [...prev, { role: 'user', text: inputText }]);
        setInputText('');
        setIsTyping(true);

        // Simulate AI response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                role: 'concierge',
                text: "I'll analyze that for you. Based on your profile and the current market data, I have some strategic recommendations ready.",
            }]);
            setIsTyping(false);
        }, 2000);
    };

    return (
        <div className="max-w-[1100px] space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-6 min-h-[calc(100vh-180px)]">
                {/* Left Column - Voice Interface */}
                <div className="flex flex-col">
                    <div className="flex-1 flex flex-col items-center justify-center py-8">
                        <AudioVisualizer isActive={isListening && !isPaused} />

                        <h2 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 font-headline mt-8 text-center">
                            Listening for your aspirations...
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center max-w-md">
                            "I'm ready. Let's discuss your next career move or refine your job search strategy."
                        </p>

                        {/* Controls */}
                        <div className="flex items-center gap-4 mt-8">
                            <button
                                onClick={() => setShowKeyboard(!showKeyboard)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                    showKeyboard
                                        ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600'
                                        : 'bg-gray-100 dark:bg-[#22252f] text-gray-500 hover:bg-gray-200 dark:hover:bg-[#2d3140]'
                                }`}
                            >
                                <Keyboard className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setIsListening(!isListening)}
                                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-lg ${
                                    isListening
                                        ? 'bg-brand-600 text-white shadow-brand-600/30 hover:bg-brand-700'
                                        : 'bg-gray-200 dark:bg-[#22252f] text-gray-500 hover:bg-gray-300'
                                }`}
                            >
                                {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
                            </button>
                            <button
                                onClick={() => setIsPaused(!isPaused)}
                                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                                    isPaused
                                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
                                        : 'bg-gray-100 dark:bg-[#22252f] text-gray-500 hover:bg-gray-200 dark:hover:bg-[#2d3140]'
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
                                        type="text"
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        placeholder="Type your message..."
                                        className="flex-1 px-4 py-3 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3140] rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        className="px-4 py-3 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors cursor-pointer"
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Actions */}
                    <div className="flex items-center justify-center gap-4 py-4 border-t border-slate-100 dark:border-[#2d3140]">
                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3140] rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-brand-300 transition-colors cursor-pointer">
                            <Save className="w-3.5 h-3.5" />
                            Save Discussion
                        </button>
                        <button className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#1a1d27] border border-slate-200 dark:border-[#2d3140] rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:border-brand-300 transition-colors cursor-pointer">
                            <Download className="w-3.5 h-3.5" />
                            Export Insights
                        </button>
                    </div>
                </div>

                {/* Right Column - Live Transcript + Insights */}
                <div className="flex flex-col bg-white dark:bg-[#1a1d27] rounded-2xl border border-slate-200/60 dark:border-[#2d3140] shadow-sm overflow-hidden">
                    {/* Transcript Header */}
                    <div className="px-5 py-4 border-b border-slate-100 dark:border-[#2d3140] flex items-center justify-between">
                        <span className="text-[10px] font-bold tracking-[0.15em] text-gray-400 uppercase">Live Transcript</span>
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Live
                        </span>
                    </div>

                    {/* Messages */}
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
                    <div className="border-t border-slate-100 dark:border-[#2d3140] px-5 py-4">
                        <span className="text-[9px] font-bold tracking-[0.15em] text-brand-600 uppercase">Contextual Insights</span>
                        <div className="mt-3 space-y-3">
                            {CONTEXTUAL_INSIGHTS.map((insight, i) => (
                                <div key={i} className="flex gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${insight.color}`}>
                                        <insight.icon className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-900 dark:text-gray-100">{insight.title}</h4>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{insight.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
