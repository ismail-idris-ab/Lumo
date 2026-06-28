import { ImageResponse } from 'next/og';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 36,
          background: '#1B1C42',
          fontFamily: 'sans-serif',
        }}
      >
        <svg width="160" height="160" viewBox="0 0 48 48">
          <rect width="48" height="48" rx="11" fill="#262764" />
          <circle cx="24" cy="24" r="16.5" fill="none" stroke="#FFB020" strokeWidth="2" opacity={0.45} />
          <circle cx="24" cy="24" r="11" fill="none" stroke="#FFB020" strokeWidth="3.6" />
          <circle cx="24" cy="24" r="5.4" fill="#FFB020" />
        </svg>
        <div style={{ fontSize: 96, fontWeight: 700, color: '#ffffff', letterSpacing: -2 }}>
          {SITE_NAME}
        </div>
        <div style={{ fontSize: 32, color: '#9a9bc4', maxWidth: 880, textAlign: 'center' }}>
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size },
  );
}
