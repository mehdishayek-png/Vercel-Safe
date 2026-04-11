'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ReturnNotification } from '@/components/ReturnNotification';
import { AppProvider } from '@/contexts/AppContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardLayout({ children }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    return (
        <ErrorBoundary>
            <AppProvider>
                <div className="flex min-h-screen bg-surface-50">
                    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    <div className="flex-1 flex flex-col min-w-0">
                        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
                        <ReturnNotification />
                        <main className="flex-1 px-4 py-4 md:px-6 md:py-5 dashboard-bg relative overflow-hidden">
                            {/* Ambient AI glow blobs */}
                            <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-brand-500/30 blur-[120px] rounded-full pointer-events-none" />
                            <div className="absolute top-[40%] -left-[10%] w-[400px] h-[400px] bg-brand-500/10 blur-[100px] rounded-full pointer-events-none" />
                            <div className="relative z-10">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            </AppProvider>
        </ErrorBoundary>
    );
}
