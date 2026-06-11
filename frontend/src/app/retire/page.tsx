import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Flame } from 'lucide-react';

export default function RetirePage() {
  return (
    <div className="container-page py-8">
      <div className="text-center py-16">
        <Flame className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-3xl font-bold mb-2">Retire Credits</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Permanently retire carbon credits on the Stellar blockchain. Select credits and specify the beneficiary.
        </p>
      </div>
    </div>
  );
}
