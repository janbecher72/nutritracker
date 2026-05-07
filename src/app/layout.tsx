import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NutriTracker',
  description: 'Personal nutrition tracker for athletes',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="cs" className="h-full">
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        {children}
      </body>
    </html>
  );
}
