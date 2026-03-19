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
          justifyContent: 'space-between',
          background: '#0a0a14',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
          padding: '48px 56px',
        }}
      >
        {/* Subtle gradient overlays */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          background: 'linear-gradient(180deg, rgba(99,102,241,0.06) 0%, transparent 40%, rgba(99,102,241,0.04) 100%)',
          display: 'flex',
        }} />
        {/* Vertical accent lines */}
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: '20%',
          width: '1px', background: 'rgba(99,102,241,0.08)',
          display: 'flex',
        }} />
        <div style={{
          position: 'absolute', top: 0, bottom: 0, left: '80%',
          width: '1px', background: 'rgba(99,102,241,0.08)',
          display: 'flex',
        }} />
        {/* Horizontal accent line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: '65%',
          height: '1px', background: 'rgba(99,102,241,0.1)',
          display: 'flex',
        }} />

        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
            borderRadius: '24px', padding: '6px 16px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#818cf8', display: 'flex' }} />
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#a5b4fc', letterSpacing: '1.5px' }}>
              AI-POWERED JOB MATCHING · BETA
            </span>
          </div>
          {/* Brand name */}
          <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#4b5563', letterSpacing: '4px' }}>
            MIDAS
          </span>
        </div>

        {/* Main headline */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 1, marginTop: '24px' }}>
          <span style={{ fontSize: '64px', fontWeight: '900', color: '#ffffff', lineHeight: 1.1, letterSpacing: '-1px' }}>
            1,000 Jobs Scanned.
          </span>
          <span style={{
            fontSize: '64px', fontWeight: '900', lineHeight: 1.1, letterSpacing: '-1px',
            background: 'linear-gradient(135deg, #7c3aed, #a855f7, #7c3aed)',
            backgroundClip: 'text',
            color: 'transparent',
          }}>
            Only the Best Delivered.
          </span>

          {/* Subtitle */}
          <span style={{ fontSize: '16px', color: '#6b7280', lineHeight: 1.6, marginTop: '16px', maxWidth: '600px' }}>
            Upload your resume. Our AI scores every job against your profile across 8+ sources
            and surfaces only the matches worth your time.
          </span>
        </div>

        {/* Bottom section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: '40px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff' }}>8+</span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#4b5563', letterSpacing: '1px', marginTop: '2px' }}>JOB SOURCES</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff' }}>Free</span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#4b5563', letterSpacing: '1px', marginTop: '2px' }}>DURING BETA</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff' }}>5/day</span>
              <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#4b5563', letterSpacing: '1px', marginTop: '2px' }}>AI SCANS</span>
            </div>
          </div>

          {/* Tech pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxWidth: '420px', justifyContent: 'flex-end' }}>
            {['Semantic Search', 'Heuristic Matching', 'NLP Skill Extraction', 'Vector Embeddings', 'Seniority-Aware Scoring', 'Real-Time Indexing'].map((label) => (
              <div key={label} style={{
                padding: '6px 14px', borderRadius: '6px',
                border: '1px solid rgba(99,102,241,0.2)',
                background: 'rgba(99,102,241,0.06)',
                fontSize: '11px', fontWeight: '600', color: '#818cf8',
                display: 'flex',
              }}>
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
