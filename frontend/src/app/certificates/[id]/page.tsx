'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CertificatePreview } from '@/components/certificate-preview';
import {
  getCertificateById,
  verifyCertificate,
} from '@/lib/api';
import type { Certificate } from '@/types';
import {
  Shield,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  AlertCircle,
  FileText,
  ExternalLink,
  QrCode,
} from 'lucide-react';

export default function CertificateVerificationPage() {
  const params = useParams();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    valid: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const id = params.id as string;
    getCertificateById(id)
      .then(setCertificate)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleVerify = async () => {
    if (!certificate?.certificateHash) return;
    setVerifying(true);
    setVerificationResult(null);
    try {
      const result = await verifyCertificate(certificate.certificateHash);
      setVerificationResult({
        valid: true,
        message: 'Certificate hash verified on-chain. The retirement is recorded on the Stellar blockchain.',
      });
    } catch {
      setVerificationResult({
        valid: false,
        message: 'Verification failed. The certificate hash could not be found on-chain.',
      });
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="container-page py-8">
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="container-page py-8">
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Certificate Not Found</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            This certificate does not exist or has been removed.
          </p>
          <Link href="/">
            <Button variant="outline" className="mt-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const retirement = certificate.retirement;

  return (
    <div className="container-page py-8">
      <Link href="/portfolio">
        <Button variant="ghost" size="sm" className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Portfolio
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Certificate #{certificate.id.slice(0, 8)}</CardTitle>
            </CardHeader>
            <CardContent>
              <CertificatePreview certificate={certificate} />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Verification</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {verificationResult ? (
                <div
                  className={`rounded-lg p-4 flex items-start gap-3 ${
                    verificationResult.valid
                      ? 'bg-green-50 dark:bg-green-950/20 border border-green-200'
                      : 'bg-red-50 dark:bg-red-950/20 border border-red-200'
                  }`}
                >
                  {verificationResult.valid ? (
                    <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  )}
                  <div>
                    <p
                      className={`font-semibold text-sm ${
                        verificationResult.valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {verificationResult.valid ? 'Verified' : 'Verification Failed'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">{verificationResult.message}</p>
                  </div>
                </div>
              ) : certificate.certificateHash ? (
                <div className="text-center py-4">
                  <QrCode className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Verify this certificate against the on-chain record.
                  </p>
                  <Button onClick={handleVerify} disabled={verifying} className="w-full">
                    {verifying ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Shield className="h-4 w-4 mr-2" />
                    )}
                    Verify On-Chain
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  No on-chain hash available for verification.
                </div>
              )}

              {certificate.certificateHash && (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-1">Certificate Hash</p>
                  <p className="font-mono text-xs break-all bg-muted rounded px-2 py-1">
                    {certificate.certificateHash}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {retirement && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Retirement Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Beneficiary</span>
                  <span className="font-medium">{retirement.beneficiary}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tonnes Retired</span>
                  <span className="font-medium">{retirement.tonnesRetired} tCO₂e</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reason</span>
                  <span>{retirement.reason || 'Not specified'}</span>
                </div>
                {retirement.credit && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Methodology</span>
                      <Badge variant="outline">{retirement.credit.methodology}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Geography</span>
                      <span>{retirement.credit.geography}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vintage</span>
                      <span>
                        {retirement.credit.vintageStart} – {retirement.credit.vintageEnd}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Retired On</span>
                  <span>{new Date(retirement.timestamp).toLocaleDateString()}</span>
                </div>
                {retirement.txHash && (
                  <div>
                    <span className="text-muted-foreground">Transaction</span>
                    <p className="font-mono text-xs mt-1 break-all bg-muted rounded px-2 py-1">
                      {retirement.txHash}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {certificate.certificateHash && verificationResult?.valid && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Share</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${retirement?.txHash || certificate.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on Stellar Expert
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
