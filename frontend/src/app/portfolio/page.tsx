import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export default function PortfolioPage() {
  return (
    <div className="container-page py-8">
      <div className="text-center py-16">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Portfolio</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          View your owned credits, offer history, and certificates gallery. Connect your wallet to get started.
        </p>
      </div>
    </div>
  );
}
