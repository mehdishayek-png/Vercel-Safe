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
          background: 'linear-gradient(145deg, #0f172a 0%, #1a1f3a 40%, #0f172a 100%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '48px 56px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Decorative elements */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: '450px', height: '450px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', bottom: '-150px', left: '-50px',
          width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(20,184,166,0.1) 0%, transparent 70%)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: '50%', right: '15%',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '6px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'linear-gradient(135deg, #6366f1, #14b8a6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: 'bold', color: 'white',
          }}>M</div>
          <span style={{ fontSize: '28px', fontWeight: 'bold', color: 'white', letterSpacing: '-0.5px' }}>
            Midas Match
          </span>
          <span style={{
            fontSize: '11px', fontWeight: 'bold', color: '#f59e0b',
            background: 'rgba(245,158,11,0.15)', padding: '3px 10px',
            borderRadius: '20px', border: '1px solid rgba(245,158,11,0.3)',
            marginLeft: '4px', letterSpacing: '1px',
          }}>BETA</span>
        </div>

        <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px', marginTop: '4px' }}>
          The Tech Stack Behind AI-Powered Job Matching
        </p>

        {/* Main grid - 3 columns */}
        <div style={{ display: 'flex', gap: '20px', flex: 1 }}>

          {/* Column 1: Frontend */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <div style={{
              fontSize: '10px', fontWeight: 'bold', color: '#818cf8',
              letterSpacing: '2px', marginBottom: '2px',
            }}>FRONTEND</div>

            {[
              { name: 'Next.js 14', desc: 'App Router + SSR' },
              { name: 'React 18', desc: 'Server Components' },
              { name: 'Tailwind CSS', desc: 'Utility-first styling' },
              { name: 'Framer Motion', desc: 'Animations' },
              { name: 'Clerk', desc: 'Authentication' },
            ].map((item) => (
              <div key={item.name} style={{
                display: 'flex', flexDirection: 'column',
                background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{item.name}</span>
                <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{item.desc}</span>
              </div>
            ))}
          </div>

          {/* Column 2: Backend + AI */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <div style={{
              fontSize: '10px', fontWeight: 'bold', color: '#14b8a6',
              letterSpacing: '2px', marginBottom: '2px',
            }}>BACKEND + AI</div>

            {[
              { name: 'Vercel', desc: 'Edge + Serverless' },
              { name: 'Redis', desc: 'Caching + Rate Limiting' },
              { name: 'LLM Pipeline', desc: 'Query Planning + Scoring' },
              { name: 'AI Models', desc: 'Deep Analysis + Reasoning' },
              { name: 'Email Service', desc: 'Transactional Alerts' },
            ].map((item) => (
              <div key={item.name} style={{
                display: 'flex', flexDirection: 'column',
                background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{item.name}</span>
                <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{item.desc}</span>
              </div>
            ))}
          </div>

          {/* Column 3: Data Sources */}
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <div style={{
              fontSize: '10px', fontWeight: 'bold', color: '#f59e0b',
              letterSpacing: '2px', marginBottom: '2px',
            }}>DATA SOURCES</div>

            {[
              { name: 'Google Jobs', desc: 'Primary search engine' },
              { name: 'Career Pages', desc: '350+ companies direct' },
              { name: 'LinkedIn', desc: 'Professional network' },
              { name: 'Job Boards', desc: 'Multiple free sources' },
              { name: 'RSS Feeds', desc: 'Remote-first boards' },
            ].map((item) => (
              <div key={item.name} style={{
                display: 'flex', flexDirection: 'column',
                background: 'rgba(255,255,255,0.04)', borderRadius: '10px',
                padding: '10px 12px', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{item.name}</span>
                <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats bar */}
        <div style={{
          display: 'flex', gap: '32px', marginTop: '24px',
          padding: '16px 20px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          {[
            { value: '8+', label: 'Job Sources' },
            { value: '350+', label: 'Career Pages' },
            { value: '<60s', label: 'Scan Time' },
            { value: '$0.08', label: 'Per Search' },
            { value: '7', label: 'AI Queries' },
          ].map((s) => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>{s.value}</span>
              <span style={{ fontSize: '9px', color: '#64748b', marginTop: '2px', letterSpacing: '0.5px' }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{
          display: 'flex', justifyContent: 'center',
          marginTop: '16px', fontSize: '13px', color: '#475569', letterSpacing: '0.5px',
        }}>
          midasmatch.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
