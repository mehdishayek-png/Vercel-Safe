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
                <div className="flex min-h-screen bg-surface-50 dark:bg-ink-950">
                    <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
                    <div className="flex-1 flex flex-col min-w-0">
                        <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
                        <ReturnNotification />
                        <main className="flex-1 px-4 py-4 md:px-6 md:py-5 dashboard-bg">
                            {children}
                        </main>
                    </div>
                </div>
            </AppProvider>
        </ErrorBoundary>
    );
}
