import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'G-Lab CMS - Panel admina',
  description: 'Panel administracyjny G-Lab Chip Tuning - zarządzanie realizacjami i katalogiem.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
