'use client';

/**
 * ProfileSetupDialog
 * Mandatory — shown to every new user before they can use the app.
 * Cannot be dismissed, skipped, or closed. The only exit is saving the profile.
 * All lifestyle/demographic fields are required (no blanks allowed).
 */

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

interface ProfileSetupDialogProps {
  onClose: () => void;
}

const SMOKING_OPTIONS  = ['NEVER', 'OCCASIONALLY', 'REGULARLY'] as const;
const DRINKING_OPTIONS = ['NEVER', 'OCCASIONALLY', 'REGULARLY'] as const;
const DIETARY_OPTIONS  = ['VEG', 'NON_VEG', 'EGGETARIAN', 'VEGAN', 'OTHER'] as const;
const GENDER_OPTIONS   = ['MALE', 'FEMALE', 'NON_BINARY', 'PREFER_NOT_TO_SAY', 'OTHER'] as const;

const LABEL: Record<string, string> = {
  NEVER: 'Never', OCCASIONALLY: 'Occasionally', REGULARLY: 'Regularly',
  VEG: 'Vegetarian', NON_VEG: 'Non-Vegetarian', EGGETARIAN: 'Eggetarian',
  VEGAN: 'Vegan', OTHER: 'Other',
  MALE: 'Male', FEMALE: 'Female', NON_BINARY: 'Non-binary',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
};

type ChipGroupProps<T extends string> = {
  options: readonly T[];
  value: T | '';
  onChange: (v: T) => void;
  hasError?: boolean;
};

function ChipGroup<T extends string>({ options, value, onChange, hasError }: ChipGroupProps<T>) {
  return (
    <div className={`flex flex-wrap gap-2 rounded-lg p-1 transition-colors ${hasError ? 'bg-red-50' : ''}`}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            value === o
              ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
              : 'bg-white text-gray-600 border-gray-200 hover:border-sky-300 hover:text-sky-600'
          }`}
        >
          {LABEL[o] ?? o}
        </button>
      ))}
    </div>
  );
}

// ─── DobInput ─────────────────────────────────────────────────────────────────
// Three text inputs (MM / DD / YYYY). Uses its own local state so the user can
// type intermediate values freely. Propagates a YYYY-MM-DD ISO string upward
// only when all three parts are complete and valid.

function DobInput({
  value,
  onChange,
  hasError,
}: {
  value: string;
  onChange: (iso: string) => void;
  hasError?: boolean;
}) {
  const dayRef  = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  // Seed local state from incoming ISO string once (on mount / reset)
  const init = value ? value.split('-') : ['', '', ''];
  const [mm, setMm] = useState(init[1] ?? '');
  const [dd, setDd] = useState(init[2] ?? '');
  const [yyyy, setYyyy] = useState(init[0] ?? '');

  const push = (month: string, day: string, year: string) => {
    if (month && day && year.length === 4) {
      onChange(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    } else {
      // parts incomplete — clear parent so validation catches it
      onChange('');
    }
  };

  const base = 'border rounded-lg text-sm text-center font-semibold text-gray-800 ' +
    'focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition py-2 px-1';
  const err = hasError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-white';

  return (
    <div className="flex items-center gap-2">
      {/* Month */}
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        placeholder="MM"
        value={mm}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 2);
          setMm(val);
          push(val, dd, yyyy);
          if (val.length === 2) dayRef.current?.focus();
        }}
        className={`${base} ${err} w-14`}
      />
      <span className="text-gray-300 font-light text-lg select-none">/</span>
      {/* Day */}
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        maxLength={2}
        placeholder="DD"
        value={dd}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 2);
          setDd(val);
          push(mm, val, yyyy);
          if (val.length === 2) yearRef.current?.focus();
        }}
        className={`${base} ${err} w-14`}
      />
      <span className="text-gray-300 font-light text-lg select-none">/</span>
      {/* Year */}
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        maxLength={4}
        placeholder="YYYY"
        value={yyyy}
        onChange={(e) => {
          const val = e.target.value.replace(/\D/g, '').slice(0, 4);
          setYyyy(val);
          push(mm, dd, val);
        }}
        className={`${base} ${err} w-20`}
      />
    </div>
  );
}

export function ProfileSetupDialog({ onClose }: ProfileSetupDialogProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [form, setForm] = useState({
    smoking:     '' as (typeof SMOKING_OPTIONS)[number] | '',
    drinking:    '' as (typeof DRINKING_OPTIONS)[number] | '',
    dietary:     '' as (typeof DIETARY_OPTIONS)[number] | '',
    gender:      '' as (typeof GENDER_OPTIONS)[number] | '',
    ethnicity:   '',
    dateOfBirth: '',
    bio:         '',
  });

  const set = <K extends keyof typeof form>(key: K, val: (typeof form)[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Fields that are truly required (chips — must pick one)
  const errors = {
    smoking:     !form.smoking,
    drinking:    !form.drinking,
    dietary:     !form.dietary,
    gender:      !form.gender,
    dateOfBirth: !form.dateOfBirth,
  };
  const hasAnyError = Object.values(errors).some(Boolean);

  const handleSave = async () => {
    if (hasAnyError) {
      setShowErrors(true);
      toast({
        title: 'Please complete all required fields',
        description: 'Smoking, drinking, diet, gender, and date of birth are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const body: Record<string, string | null> = {
        smoking:     form.smoking     || null,
        drinking:    form.drinking    || null,
        dietary:     form.dietary     || null,
        gender:      form.gender      || null,
        ethnicity:   form.ethnicity.trim() || null,
        dateOfBirth: form.dateOfBirth || null,
        bio:         form.bio.trim()  || null,
      };

      const res = await fetch('/api/profile', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Save failed');
      }

      toast({ title: 'Profile saved!', description: 'Welcome to NestMates.' });
      onClose();
    } catch (err: unknown) {
      toast({
        title: 'Could not save',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {/* Non-dismissible overlay — no onClick handler on the backdrop */}
      <div
        className="fixed inset-0 z-[200] flex items-center justify-center p-4"
        style={{ background: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(6px)' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
        >
          {/* Header — no X button */}
          <div className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-gray-100 bg-gradient-to-r from-sky-50 to-white">
            <div className="w-10 h-10 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-sky-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Complete Your Profile</h2>
              <p className="text-xs text-gray-500">
                Required before you can use NestMates — helps others know who they might be living with
              </p>
            </div>
          </div>

          {/* Mandatory notice */}
          <div className="flex items-start gap-2 mx-6 mt-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Fields marked <span className="font-semibold">*</span> are required. Ethnicity and bio are optional.
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">

            {/* Smoking */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Smoking <span className="text-red-500">*</span>
                {showErrors && errors.smoking && (
                  <span className="ml-2 text-xs font-normal text-red-500">Please select one</span>
                )}
              </p>
              <ChipGroup
                options={SMOKING_OPTIONS}
                value={form.smoking}
                onChange={(v) => set('smoking', v)}
                hasError={showErrors && errors.smoking}
              />
            </div>

            {/* Drinking */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Drinking <span className="text-red-500">*</span>
                {showErrors && errors.drinking && (
                  <span className="ml-2 text-xs font-normal text-red-500">Please select one</span>
                )}
              </p>
              <ChipGroup
                options={DRINKING_OPTIONS}
                value={form.drinking}
                onChange={(v) => set('drinking', v)}
                hasError={showErrors && errors.drinking}
              />
            </div>

            {/* Dietary */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Dietary preference <span className="text-red-500">*</span>
                {showErrors && errors.dietary && (
                  <span className="ml-2 text-xs font-normal text-red-500">Please select one</span>
                )}
              </p>
              <ChipGroup
                options={DIETARY_OPTIONS}
                value={form.dietary}
                onChange={(v) => set('dietary', v)}
                hasError={showErrors && errors.dietary}
              />
            </div>

            {/* Gender */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                Gender <span className="text-red-500">*</span>
                {showErrors && errors.gender && (
                  <span className="ml-2 text-xs font-normal text-red-500">Please select one</span>
                )}
              </p>
              <ChipGroup
                options={GENDER_OPTIONS}
                value={form.gender}
                onChange={(v) => set('gender', v)}
                hasError={showErrors && errors.gender}
              />
            </div>

            {/* Date of Birth */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Date of birth <span className="text-red-500">*</span>
                <span className="ml-1 text-xs font-normal text-gray-400">(shown as age to others)</span>
                {showErrors && errors.dateOfBirth && (
                  <span className="ml-2 text-xs font-normal text-red-500">Required</span>
                )}
              </p>
              <DobInput
                value={form.dateOfBirth}
                onChange={(v) => set('dateOfBirth', v)}
                hasError={showErrors && errors.dateOfBirth}
              />
              <p className="text-xs text-gray-400 mt-1">Format: MM / DD / YYYY</p>
            </div>

            {/* Ethnicity (optional) */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Ethnicity <span className="text-xs font-normal text-gray-400">(optional)</span>
              </p>
              <input
                type="text"
                maxLength={80}
                placeholder="e.g. South Asian, Hispanic, East Asian…"
                value={form.ethnicity}
                onChange={(e) => set('ethnicity', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
              />
            </div>

            {/* Bio (optional) */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">
                Short bio <span className="text-xs font-normal text-gray-400">(optional, max 300 chars)</span>
              </p>
              <textarea
                maxLength={300}
                rows={3}
                placeholder="Tell potential roommates a little about yourself…"
                value={form.bio}
                onChange={(e) => set('bio', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
              />
              <p className="text-right text-xs text-gray-400 mt-0.5">{form.bio.length}/300</p>
            </div>
          </div>

          {/* Footer — single action, no skip */}
          <div className="px-6 pb-5 pt-3 border-t border-gray-100">
            <Button
              onClick={handleSave}
              isLoading={isSaving}
              className="w-full font-semibold"
              size="default"
            >
              {!isSaving && <Check className="w-4 h-4 mr-1.5" />}
              Save & Continue
              {!isSaving && <ChevronRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
