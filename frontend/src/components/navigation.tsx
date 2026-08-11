'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/hooks/use-wallet';
import { WalletConnector } from '@/components/wallet-connector';
import { cn } from '@/lib/utils';
import { Leaf, Store, Trophy, Users, Webhook, FileBarChart, GitMerge } from 'lucide-react';

const publicLinks = [
  { href: '/', label: 'Market', icon: Leaf },
  { href: '/credits', label: 'Credits', icon: Store },
  { href: '/marketplace', label: 'Marketplace', icon: Store },
];

const authLinks = [
  { href: '/portfolio', label: 'Portfolio', icon: Trophy },
  { href: '/bridge', label: 'Bridge', icon: GitMerge },
  { href: '/reporting', label: 'Reporting', icon: FileBarChart },
  { href: '/retire', label: 'Retire', icon: Users },
  { href: '/webhooks', label: 'Webhooks', icon: Webhook },
];

export function Navigation() {
  const pathname = usePathname();
  const { wallet } = useWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container-page flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <Leaf className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">CarbonVeritas</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {publicLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            {wallet?.isConnected && authLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary',
                    isActive ? 'text-primary' : 'text-muted-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <WalletConnector />
        </div>
      </div>
    </header>
  );
}
