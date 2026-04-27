'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Loader2, Check, Globe } from 'lucide-react';

export default function VerifyOtpPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter all 6 digits',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      if (response.ok) {
        toast({
          title: 'Verified!',
          description: 'Your email has been verified successfully.',
        });
        router.push('/select-location');
      } else {
        const data = await response.json();
        toast({
          title: 'Verification failed',
          description: data.message || 'Invalid verification code',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
      });

      if (response.ok) {
        toast({
          title: 'Code sent!',
          description: 'A new verification code has been sent to your email.',
        });
      } else {
        throw new Error('Failed to send code');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-50 via-primary-50/30 to-secondary-50/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary-100 flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary-600" />
          </div>
          <CardTitle className="text-2xl font-display">Verify Your Email</CardTitle>
          <CardDescription>
            We've sent a 6-digit code to<br />
            <span className="font-medium text-foreground">{session?.user?.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* OTP Input */}
          <div className="flex justify-center gap-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                className="w-12 h-14 text-center text-xl font-bold border-2 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
              />
            ))}
          </div>

          <Button
            onClick={handleVerify}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Verify & Continue
              </>
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Didn't receive the code?{' '}
            <button
              onClick={handleResend}
              disabled={isResending}
              className="text-primary-600 hover:underline font-medium disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend'}
            </button>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

