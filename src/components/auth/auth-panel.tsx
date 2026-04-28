'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Lock, User, ArrowRight, Check, Eye, EyeOff, KeyRound } from 'lucide-react';
import { SafetyAcknowledgment } from './safety-acknowledgment';
import { SAFETY_NOTICE_VERSION } from '@/lib/safety/notice';

type AuthMode = 'signin' | 'signup' | 'forgot-password' | 'reset-otp' | 'signup-safety';

export function AuthPanel() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { toast } = useToast();

  // Form data
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  // OTP for password reset
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Reset password visibility whenever the auth mode changes so visibility
  // set in one form never bleeds into another.
  useEffect(() => {
    setShowPassword(false);
    setShowConfirmPassword(false);
    setShowResetPassword(false);
  }, [mode]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast({
        title: 'Missing fields',
        description: 'Please enter your email and password',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Welcome back!',
          description: 'Signed in successfully.',
        });
        router.replace('/accommodation');
      } else {
        const data = await response.json();
        // Account exists but email not yet verified
        if (response.status === 403 && data.needsVerification) {
          toast({
            title: 'Email not verified',
            description: 'Check your inbox for the verification code.',
          });
          router.replace(`/auth/verify?email=${encodeURIComponent(data.email || formData.email)}`);
          return;
        }
        toast({
          title: 'Sign in failed',
          description: response.status === 429
            ? `Too many sign-in attempts. Please wait ${Math.ceil((data.retryAfter ?? 900) / 60)} minute(s) and try again.`
            : (data.message || data.error || 'Invalid email or password'),
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (formData.password.length < 8) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.fullName,
          email: formData.email,
          password: formData.password,
          // The user reached this form only after acknowledging the safety
          // notice on the previous step. We pass that signal + version so the
          // server can persist it on the User record.
          safetyAcknowledged: true,
          safetyVersion: SAFETY_NOTICE_VERSION,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: 'Account created!',
          description: 'Check your email for a 6-digit verification code.',
        });
        // Do NOT sign in yet — redirect to email verification page
        router.replace(`/auth/verify?email=${encodeURIComponent(data.email || formData.email)}`);
      } else {
        const data = await response.json();
        // 429 from rate limiter uses `error` not `message`; also give a human-friendly prompt
        const description = response.status === 429
          ? `Too many sign-up attempts. Please wait ${Math.ceil((data.retryAfter ?? 3600) / 60)} minute(s) and try again.`
          : (data.message || data.error || 'Could not create account');
        toast({
          title: 'Sign up failed',
          description,
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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast({
        title: 'Email required',
        description: 'Please enter your email address',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });

      if (response.ok) {
        toast({
          title: 'Code sent!',
          description: 'If an account exists with that email, a reset code has been sent.',
        });
        setMode('reset-otp');
      } else {
        const data = await response.json();
        toast({
          title: 'Error',
          description: data.message || 'Could not send reset code',
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

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      const nextInput = document.getElementById(`reset-otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`reset-otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    
    if (code.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Please enter all 6 digits',
        variant: 'destructive',
      });
      return;
    }

    if (!newPassword || !confirmNewPassword) {
      toast({
        title: 'Missing fields',
        description: 'Please enter your new password',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword !== confirmNewPassword) {
      toast({
        title: 'Password mismatch',
        description: 'Passwords do not match',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 8) {
      toast({
        title: 'Weak password',
        description: 'Password must be at least 8 characters',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          code,
          newPassword,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Password reset!',
          description: 'You can now sign in with your new password.',
        });
        setMode('signin');
        setOtp(['', '', '', '', '', '']);
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        const data = await response.json();
        toast({
          title: 'Reset failed',
          description: data.message || 'Invalid or expired code',
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

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <AnimatePresence mode="wait">
        {mode === 'signup-safety' ? (
          <SafetyAcknowledgment
            onAccept={() => setMode('signup')}
            onCancel={() => setMode('signin')}
          />
        ) : mode === 'reset-otp' ? (
          <motion.div
            key="reset-otp"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3 lg:space-y-5"
          >
            <div className="text-center">
                <div className="w-12 h-12 lg:w-14 lg:h-14 mx-auto mb-2 lg:mb-3 rounded-full bg-sky-100 flex items-center justify-center">
                <KeyRound className="w-6 h-6 lg:w-7 lg:h-7 text-sky-600" />
              </div>
              <h2 className="text-xl lg:text-2xl font-display font-bold text-gray-800">
                Reset Password
              </h2>
              <p className="text-gray-600 mt-1 text-xs lg:text-sm">
                Enter the 6-digit code sent to<br />
                <span className="font-semibold text-gray-800">{formData.email}</span>
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3 lg:space-y-4">
              <div className="flex justify-center gap-1.5 lg:gap-2">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`reset-otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-8 h-10 lg:w-10 lg:h-12 text-center text-base lg:text-lg font-bold border-2 border-gray-300 rounded-lg focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 outline-none transition-all bg-white"
                  />
                ))}
              </div>

              <div className="space-y-2 lg:space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="newPassword" className="text-xs lg:text-sm font-semibold text-gray-700">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showResetPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      icon={<Lock className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                      className="h-9 lg:h-10 text-xs lg:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showResetPassword ? <EyeOff className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> : <Eye className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmNewPassword" className="text-xs lg:text-sm font-semibold text-gray-700">Confirm New Password</Label>
                  <Input
                    id="confirmNewPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    icon={<Lock className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                    className="h-9 lg:h-10 text-xs lg:text-sm"
                  />
                </div>
              </div>

              <Button type="submit" isLoading={isLoading} className="w-full h-9 lg:h-10 text-xs lg:text-sm font-semibold" size="default">
                Reset Password
                <Check className="ml-2 w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </Button>
            </form>

            <p className="text-center text-xs lg:text-sm text-gray-600">
              <button
                onClick={() => setMode('signin')}
                className="text-sky-600 hover:underline font-semibold"
              >
                Back to Sign In
              </button>
            </p>
          </motion.div>
        ) : mode === 'forgot-password' ? (
          <motion.div
            key="forgot-password"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3 lg:space-y-5"
          >
            <div className="text-center">
              <div className="w-12 h-12 lg:w-14 lg:h-14 mx-auto mb-2 lg:mb-3 rounded-full bg-sky-100 flex items-center justify-center">
                <Mail className="w-6 h-6 lg:w-7 lg:h-7 text-sky-600" />
              </div>
              <h2 className="text-xl lg:text-2xl font-display font-bold text-gray-800">
                Forgot Password?
              </h2>
              <p className="text-gray-600 mt-1 text-xs lg:text-sm">
                Enter your email and we'll send you a code to reset your password.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-3 lg:space-y-4">
              <div className="space-y-1">
                <Label htmlFor="reset-email" className="text-xs lg:text-sm font-semibold text-gray-700">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  icon={<Mail className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                  className="h-9 lg:h-10 text-xs lg:text-sm"
                />
              </div>

              <Button type="submit" isLoading={isLoading} className="w-full h-9 lg:h-10 text-xs lg:text-sm font-semibold" size="default">
                Send Reset Code
                <ArrowRight className="ml-2 w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </Button>
            </form>

            <p className="text-center text-xs lg:text-sm text-gray-600">
              Remember your password?{' '}
              <button
                onClick={() => setMode('signin')}
                className="text-sky-600 hover:underline font-semibold"
              >
                Sign in
              </button>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="auth"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3 lg:space-y-5"
          >
            <div className="text-center">
              <h2 className="text-xl lg:text-2xl font-display font-bold text-gray-800">
                {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-gray-600 mt-1 text-xs lg:text-sm">
                {mode === 'signin'
                  ? 'Sign in to access your community'
                  : 'Join thousands of community members'}
              </p>
            </div>

            <form onSubmit={mode === 'signin' ? handleSignIn : handleSignUp} className="space-y-3 lg:space-y-4">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1"
                >
                  <Label htmlFor="fullName" className="text-xs lg:text-sm font-semibold text-gray-700">Full Name</Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    icon={<User className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                    className="h-9 lg:h-10 text-xs lg:text-sm"
                  />
                </motion.div>
              )}

              <div className="space-y-1">
                <Label htmlFor="email" className="text-xs lg:text-sm font-semibold text-gray-700">Email <span className="font-normal text-gray-400">(your user ID — visible to others)</span></Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  icon={<Mail className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                  className="h-9 lg:h-10 text-xs lg:text-sm"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs lg:text-sm font-semibold text-gray-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    icon={<Lock className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                    className="h-9 lg:h-10 text-xs lg:text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> : <Eye className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1"
                >
                  <Label htmlFor="confirmPassword" className="text-xs lg:text-sm font-semibold text-gray-700">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      icon={<Lock className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                      className="h-9 lg:h-10 text-xs lg:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5 lg:w-4 lg:h-4" /> : <Eye className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
                    </button>
                  </div>
                </motion.div>
              )}

              {mode === 'signin' && (
                <div className="text-right">
              <button
                type="button"
                onClick={() => setMode('forgot-password')}
                className="text-xs lg:text-sm text-sky-600 hover:underline font-semibold"
              >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button type="submit" isLoading={isLoading} className="w-full h-9 lg:h-10 text-xs lg:text-sm font-semibold" size="default">
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="ml-2 w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </Button>
            </form>

            <p className="text-center text-xs lg:text-sm text-gray-600">
              {mode === 'signin' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      // Route through the safety acknowledgment first.
                      setMode('signup-safety');
                      setFormData({ fullName: '', email: '', password: '', confirmPassword: '' });
                    }}
                    className="text-sky-600 hover:underline font-semibold"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setMode('signin');
                      setFormData({ ...formData, password: '', confirmPassword: '' });
                    }}
                    className="text-sky-600 hover:underline font-semibold"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>

          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
