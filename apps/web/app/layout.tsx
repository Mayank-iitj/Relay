import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Relay - The Immutable Record of Institutional Truth',
  description: 'Enterprise knowledge handover platform that extracts, reconciles, and projects project state into an immutable transition dossier.',
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0C0D0E] text-[#ECEDEE] min-h-screen selection:bg-[#FACC15]/20 selection:text-[#ECEDEE]">
        {children}
      </body>
    </html>
  );
}

