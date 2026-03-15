'use client';
import { Sidebar } from '@/components/Sidebar';
import { DashboardHeader } from '@/components/DashboardHeader';
import { ReturnNotification } from '@/components/ReturnNotification';
import { AppProvider } from '@/contexts/AppContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function DashboardLayout({ children }) {
    return (
        <ErrorBoundary>
            <AppProvider>
                <div className="flex min-h-screen bg-surface-50">
                    <Sidebar />
                    <div className="flex-1 flex flex-col min-w-0">
                        <DashboardHeader />
                        <ReturnNotification />
                        <main className="flex-1 px-6 py-5 dashboard-bg">
                            {children}
                        </main>
                    </div>
                </div>
            </AppProvider>
        </ErrorBoundary>
    );
}
