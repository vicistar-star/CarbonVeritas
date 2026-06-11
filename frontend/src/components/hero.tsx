'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Shield, Globe, Leaf } from 'lucide-react';

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary/10" />
      <div className="container-page relative py-20 md:py-32">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border bg-muted/50 text-sm text-muted-foreground">
            <Shield className="h-4 w-4 text-primary" />
            Powered by Stellar Blockchain
          </div>

          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Transparent Carbon Credit{' '}
            <span className="text-primary">Trading</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            A transparent, on-chain carbon credit registry, marketplace, and retirement platform.
            Verify, trade, and retire carbon credits with full provenance tracking.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/credits">
              <Button size="lg">
                Browse Credits
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/marketplace">
              <Button variant="outline" size="lg">
                View Marketplace
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
            <div className="flex flex-col items-center gap-2 p-4">
              <Globe className="h-8 w-8 text-primary" />
              <h3 className="font-semibold">Verified Credits</h3>
              <p className="text-sm text-muted-foreground text-center">
                Every credit is verified by independent verifiers before minting
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4">
              <Leaf className="h-8 w-8 text-primary" />
              <h3 className="font-semibold">On-Chain Retirement</h3>
              <p className="text-sm text-muted-foreground text-center">
                Credits are permanently retired on the Stellar blockchain
              </p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4">
              <Shield className="h-8 w-8 text-primary" />
              <h3 className="font-semibold">Full Provenance</h3>
              <p className="text-sm text-muted-foreground text-center">
                Complete ownership history from issuance to retirement
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
