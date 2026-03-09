import { useEffect, useRef } from 'react';
import { Sparkles, BrainCircuit } from 'lucide-react';

export function ActivityLog({ logs }) {
    const logsEndRef = useRef(null);

    useEffect(() => {
        if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="bg-white border border-surface-200 rounded-xl h-44 overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 border-b border-surface-100 flex justify-between items-center">
                <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-brand-500" />
                    <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Activity</span>
                </div>
                <div className="flex items-center gap-1">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-[9px] font-medium text-emerald-600">Live</span>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-[11px]">
                {logs.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                        <BrainCircuit className="w-6 h-6 mb-1.5 stroke-1" />
                        <span className="text-[10px]">Waiting...</span>
                    </div>
                )}
                {logs.map((log, i) => (
                    <div key={i} className="flex gap-2 text-gray-500">
                        <span className="opacity-40 shrink-0">{log.time}</span>
                        <span className="border-l border-surface-200 pl-2 break-words">{log.message}</span>
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
        </div>
    );
}
