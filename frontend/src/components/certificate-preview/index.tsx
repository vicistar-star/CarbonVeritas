'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Share2, ExternalLink, CheckCircle, Copy } from 'lucide-react';
import type { Certificate } from '@/types';

interface CertificatePreviewProps {
  certificate: Certificate;
}

export function CertificatePreview({ certificate }: CertificatePreviewProps) {
  const certUrl = certificate.pdfUrl ?? '';
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/certificates/${certificate.id}`
    : '';

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: 'CarbonVeritas Certificate', url: shareUrl });
    } else {
      await navigator.clipboard.writeText(shareUrl);
    }
  };

  return (
    <div className="space-y-4">
      {certUrl ? (
        <div className="rounded-lg border overflow-hidden bg-muted/30">
          <iframe
            src={certUrl}
            className="w-full h-[500px]"
            title="Certificate PDF"
          />
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3" />
            <p>PDF preview not available</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {certUrl && (
          <Button variant="default" asChild>
            <a href={certUrl} target="_blank" rel="noreferrer">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </a>
          </Button>
        )}
        <Button variant="outline" onClick={handleShare}>
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
        <Button variant="outline" asChild>
          <a href={`/certificates/${certificate.id}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Verify
          </a>
        </Button>
      </div>

      {certificate.certificateHash && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted rounded-md px-3 py-2">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <span className="font-mono text-xs flex-1 truncate">
            {certificate.certificateHash}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => navigator.clipboard.writeText(certificate.certificateHash!)}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      )}

      {certificate.retirement && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Beneficiary</span>
            <p className="font-medium">{certificate.retirement.beneficiary}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Tonnes Retired</span>
            <p className="font-medium">{certificate.retirement.tonnesRetired} tCO₂e</p>
          </div>
          <div>
            <span className="text-muted-foreground">Methodology</span>
            <p>{certificate.retirement.credit?.methodology ?? 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Geography</span>
            <p>{certificate.retirement.credit?.geography ?? 'N/A'}</p>
          </div>
          {certificate.retirement.txHash && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Transaction</span>
              <p className="font-mono text-xs truncate">{certificate.retirement.txHash}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
