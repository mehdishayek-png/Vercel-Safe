import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative gradient circles */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: '-120px', left: '-60px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.2) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px',
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #6366f1, #14b8a6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px', fontWeight: 'bold', color: 'white',
          }}>
            M
          </div>
          <span style={{ fontSize: '48px', fontWeight: 'bold', color: 'white', letterSpacing: '-1px' }}>
            Midas Match
          </span>
        </div>

        {/* Tagline */}
        <div style={{
          fontSize: '28px', color: '#94a3b8', textAlign: 'center',
          maxWidth: '700px', lineHeight: '1.4', marginBottom: '40px',
          display: 'flex',
        }}>
          AI-Powered Job Matching — 1,000+ Jobs Scanned. Only the Best Delivered.
        </div>

        {/* Stats bar */}
        <div style={{
          display: 'flex', gap: '48px', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#14b8a6' }}>8+</span>
            <span style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Job Sources</span>
          </div>
          <div style={{ width: '1px', height: '48px', background: '#334155', display: 'flex' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#818cf8' }}>350+</span>
            <span style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Company Career Pages</span>
          </div>
          <div style={{ width: '1px', height: '48px', background: '#334155', display: 'flex' }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: '36px', fontWeight: 'bold', color: '#f59e0b' }}>AI</span>
            <span style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>Deep Analysis</span>
          </div>
        </div>

        {/* URL */}
        <div style={{
          position: 'absolute', bottom: '32px',
          fontSize: '18px', color: '#475569', letterSpacing: '1px',
          display: 'flex',
        }}>
          midasmatch.com
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
