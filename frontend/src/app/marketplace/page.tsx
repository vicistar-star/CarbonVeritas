import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Store } from 'lucide-react';

export default function MarketplacePage() {
  return (
    <div className="container-page py-8">
      <div className="text-center py-16">
        <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Marketplace</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Trade carbon credits on the open market. Full trading and retirement UX coming soon.
        </p>
      </div>
    </div>
  );
}
