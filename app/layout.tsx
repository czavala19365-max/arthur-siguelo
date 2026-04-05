import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arthur — Asistente Legal IA',
  description: 'Seguimiento inteligente de trámites registrales y procesos judiciales',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" style={{ height: '100%' }}>
      <head>
        {/* Intentional global fonts for branding; next/font would split subsets per route */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=Outfit:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        style={{
          height: '100%',
          background: 'var(--paper)',
          margin: 0,
          color: 'var(--ink)',
        }}
      >
        {children}
      </body>
    </html>
  );
}
