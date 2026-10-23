import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Hidani Tech Copilot | Real-Time Interview Assistant POC',
  description: 'Sub-3s Real-Time Interview Assistant (Audio -> Deepgram STT -> Question Detection -> OpenAI Streaming Answer -> 3-Panel UI)',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-slate-100 min-h-screen antialiased flex flex-col">
        {children}
      </body>
    </html>
  );
}
