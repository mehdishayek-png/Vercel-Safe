import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Midas Match — AI-Powered Job Matching';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
    return new ImageResponse(
        (
            <div
                style={{
                    background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #4338ca 60%, #6366f1 100%)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '80px',
                    fontFamily: 'Helvetica Neue, Helvetica, Arial, sans-serif',
                }}
            >
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
                    <div
                        style={{
                            width: '56px',
                            height: '56px',
                            borderRadius: '14px',
                            background: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '28px',
                            fontWeight: 800,
                            color: '#4338ca',
                        }}
                    >
                        M
                    </div>
                    <span style={{ fontSize: '32px', fontWeight: 700, color: 'white', letterSpacing: '-0.02em' }}>
                        Midas Match
                    </span>
                </div>

                {/* Headline */}
                <div
                    style={{
                        fontSize: '72px',
                        fontWeight: 800,
                        color: 'white',
                        lineHeight: 1.1,
                        letterSpacing: '-0.03em',
                        marginBottom: '24px',
                    }}
                >
                    1,000 Jobs Scanned.
                    <br />
                    <span style={{ color: '#a5b4fc' }}>Only the Best Delivered.</span>
                </div>

                {/* Subtext */}
                <div
                    style={{
                        fontSize: '24px',
                        color: '#c7d2fe',
                        lineHeight: 1.5,
                        maxWidth: '700px',
                    }}
                >
                    AI-powered job matching from 8+ sources. Upload your resume, get scored matches in under 60 seconds.
                </div>

                {/* Stats bar */}
                <div style={{ display: 'flex', gap: '48px', marginTop: '48px' }}>
                    {[
                        { value: '350+', label: 'Career Pages' },
                        { value: '8+', label: 'Job Sources' },
                        { value: '<60s', label: 'Scan Time' },
                    ].map(({ value, label }) => (
                        <div key={label} style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '36px', fontWeight: 800, color: 'white' }}>{value}</span>
                            <span style={{ fontSize: '16px', color: '#a5b4fc', marginTop: '4px' }}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        ),
        { ...size }
    );
}
