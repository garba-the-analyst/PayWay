import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PayWay — Pay with Card',
  description: 'Pay in USD with any global card. No accounts, no verification. Settled as USDT.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a className="brand" href="/">PayWay</a>
          <nav>{/* Ops console lives at a private URL, intentionally unlinked. */}</nav>
        </header>
        <main className="wrap">{children}</main>
        <footer className="foot">
          PayWay · Card collections, settled as USDT · No accounts, no verification
        </footer>
      </body>
    </html>
  );
}
