'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Home, Mail, Loader2, RotateCcw, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

function VerifyOtpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const email = searchParams.get('email') || '';
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Redirect to home if no email param
  useEffect(() => {
    if (!email) {
      router.replace('/');
    }
  }, [email, router]);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    // Handle paste of full 6-digit code
    if (value.length === 6 && /^\d{6}$/.test(value)) {
      const digits = value.split('');
      setOtp(digits);
      inputRefs.current[5]?.focus();
      return;
    }
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const code = otp.join('');
    if (code.length !== 6) {
      toast({ title: 'Enter all 6 digits', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({ title: 'Email verified!', description: 'Welcome to NestMates.' });
        router.replace('/accommodation');
      } else {
        toast({ title: 'Verification failed', description: data.message, variant: 'destructive' });
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (response.ok) {
        toast({ title: 'Code resent', description: 'Check your inbox for a new code.' });
        setResendCooldown(60);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        const data = await response.json();
        toast({ title: 'Could not resend', description: data.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Something went wrong', description: 'Please try again.', variant: 'destructive' });
    } finally {
      setIsResending(false);
    }
  };

  if (!email) return null;

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(145deg, #075985 0%, #0284c7 40%, #38bdf8 80%, #e0f2fe 100%)' }}
    >
      {/* Soft decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-sky-300/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">NestMates</span>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl shadow-sky-950/25 p-8 border border-white/60">
          {/* Icon */}
          <div className="flex justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 flex items-center justify-center">
              <Mail className="w-7 h-7 text-sky-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">
            Verify Your Email
          </h1>
          <p className="text-sm text-center text-gray-500 mb-6">
            We sent a 6-digit code to{' '}
            <span className="font-semibold text-gray-700">{email}</span>
          </p>

          {/* OTP inputs */}
          <div className="flex justify-center gap-2 mb-6">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                id={`otp-${i}`}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="w-11 h-13 text-center text-xl font-bold border-2 border-gray-200 rounded-xl
                  focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none
                  transition-all bg-gray-50 focus:bg-white text-gray-900"
                style={{ height: '3.25rem' }}
                autoFocus={i === 0}
              />
            ))}
          </div>

          {/* Verify button */}
          <button
            onClick={handleVerify}
            disabled={isLoading || otp.join('').length !== 6}
            className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300
              text-white font-semibold text-base transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Verifying…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Verify &amp; Continue
              </>
            )}
          </button>

          {/* Resend */}
          <p className="text-center text-sm text-gray-500 mt-4">
            Didn&apos;t receive a code?{' '}
            <button
              onClick={handleResend}
              disabled={isResending || resendCooldown > 0}
              className="text-sky-600 hover:text-sky-700 font-semibold disabled:opacity-40 inline-flex items-center gap-1"
            >
              {isResending ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Sending…</>
              ) : resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : (
                <><RotateCcw className="w-3 h-3" /> Resend code</>
              )}
            </button>
          </p>

          {/* Back link */}
          <p className="text-center text-xs text-gray-400 mt-4">
            Wrong email?{' '}
            <button
              onClick={() => router.replace('/')}
              className="text-sky-500 hover:underline"
            >
              Go back
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense>
      <VerifyOtpContent />
    </Suspense>
  );
}
