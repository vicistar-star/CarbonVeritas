import type { Metadata } from 'next';
import './globals.css';
import { Navigation } from '@/components/navigation';
import { WalletProvider } from '@/hooks/use-wallet';

export const metadata: Metadata = {
  title: 'CarbonVeritas — Transparent Carbon Credit Trading',
  description: 'A transparent, on-chain carbon credit registry, marketplace, and retirement platform built on Stellar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <WalletProvider>
          <Navigation />
          <main className="min-h-screen">{children}</main>
          <footer className="border-t py-8 mt-16">
            <div className="container-page text-center text-sm text-muted-foreground">
              <p>CarbonVeritas Protocol — Built on Stellar</p>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  );
}
