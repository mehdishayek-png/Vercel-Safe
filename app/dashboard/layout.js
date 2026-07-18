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
                <div className="flex min-h-screen bg-surface-50 text-slate-900">
                    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    <div className="flex-1 flex flex-col min-w-0">
                        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
                        <ReturnNotification />
                        <main className="dashboard-bg relative flex-1 overflow-hidden px-3 py-4 md:px-6 md:py-6">
                            <div className="relative z-10 mx-auto w-full max-w-[1440px]">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            </AppProvider>
        </ErrorBoundary>
    );
}
