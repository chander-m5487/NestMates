'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, ArrowLeft, Globe } from 'lucide-react';

const errorMessages: Record<string, string> = {
  Configuration: 'There is a problem with the server configuration.',
  AccessDenied: 'Access was denied. You may not have permission to sign in.',
  Verification: 'The verification token has expired or has already been used.',
  Default: 'An error occurred during authentication.',
};

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get('error') || 'Default';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 via-primary-50/30 to-secondary-50/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-danger" />
          </div>
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
          <CardDescription>
            {errorMessages[error] || errorMessages.Default}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/">
            <Button className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

