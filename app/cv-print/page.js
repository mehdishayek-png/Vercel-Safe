'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Printer, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CVPrintPage() {
    const [cvData, setCvData] = useState(null);
    const router = useRouter();

    useEffect(() => {
        try {
            const data = localStorage.getItem('print_cv_data');
            if (data) Object.assign(window, { __cv_markdown: data });
            setCvData(data || 'No CV data found.');
        } catch (e) {
            setCvData('Failed to load CV data.');
        }
    }, []);

    if (!cvData) return <div className="p-10 font-mono text-xs">Loading CV Data...</div>;

    if (cvData === 'No CV data found.' || cvData === 'Failed to load CV data.'){
        return <div className="p-10 text-red-500 font-mono flex flex-col items-start gap-4">
            {cvData}
            <Button onClick={() => router.back()}>Go Back</Button>
        </div>;
    }

    return (
        <div className="bg-white min-h-screen printable-cv-container">
            {/* Non-printable controls */}
            <div className="print:hidden fixed top-4 right-4 flex items-center gap-2 bg-white/80 p-3 rounded-lg shadow-lg border backdrop-blur-md z-50">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-gray-500 hover:text-gray-800">
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
                </Button>
                <div className="w-px h-5 bg-gray-200 mx-1" />
                <Button size="sm" onClick={() => window.print()} className="bg-gray-900 text-white">
                    <Printer className="w-4 h-4 mr-1.5" /> Print / Save as PDF
                </Button>
            </div>

            {/* Printable CV Page */}
            <div className="max-w-[800px] mx-auto p-12 print:p-0 font-sans text-gray-900 cv-markdown-content text-sm leading-relaxed" 
                 dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(cvData) }} />

            <style jsx global>{`
                @media print {
                    @page { margin: 0.5in; size: letter; }
                    body { background: white; -webkit-print-color-adjust: exact; }
                    .print\\:hidden { display: none !important; }
                    .cv-markdown-content h1 { font-size: 24px; font-weight: 700; margin-bottom: 4px; color: #111827; }
                    .cv-markdown-content h2 { font-size: 16px; font-weight: 600; margin-top: 20px; margin-bottom: 8px; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
                    .cv-markdown-content h3 { font-size: 14px; font-weight: 600; margin-top: 12px; margin-bottom: 4px; color: #374151; }
                    .cv-markdown-content p { margin-bottom: 8px; color: #4b5563; line-height: 1.5; }
                    .cv-markdown-content ul { list-style-type: disc; padding-left: 20px; margin-bottom: 12px; margin-top: 4px; color: #4b5563; }
                    .cv-markdown-content li { margin-bottom: 4px; line-height: 1.5; }
                    .cv-markdown-content strong { font-weight: 600; color: #1f2937; }
                }
                .cv-markdown-content h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; color: #111827; }
                .cv-markdown-content h2 { font-size: 18px; font-weight: 600; margin-top: 24px; margin-bottom: 12px; color: #1f2937; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
                .cv-markdown-content h3 { font-size: 16px; font-weight: 600; margin-top: 16px; margin-bottom: 4px; color: #374151; }
                .cv-markdown-content p { margin-bottom: 12px; color: #4b5563; line-height: 1.6; }
                .cv-markdown-content ul { list-style-type: disc; padding-left: 24px; margin-bottom: 16px; margin-top: 8px; color: #4b5563; }
                .cv-markdown-content li { margin-bottom: 6px; line-height: 1.6; }
                .cv-markdown-content strong { font-weight: 600; color: #1f2937; }
            `}</style>
        </div>
    );
}

function parseMarkdownToHtml(md) {
    let html = md;
    
    // Convert Headers
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
    
    // Bold
    html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    
    // Lists
    html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
    
    // Wrap lists
    html = html.replace(/<\/li>\n<li>/gim, '</li><li>');
    html = html.replace(/(<li>.*<\/li>)/gim, '<ul>$1</ul>');
    
    // Paragraphs
    html = html.replace(/^(?!<h|<ul|<li)(.+)$/gim, '<p>$1</p>');
    
    // Cleanup extra newlines
    html = html.replace(/\n/gim, '');
    
    return html;
}
