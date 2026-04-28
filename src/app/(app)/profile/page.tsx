'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Save,
  Loader2,
  CheckCircle2,
  CalendarDays,
  Utensils,
  Wine,
  Cigarette,
  PersonStanding,
  Globe2,
  BookOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/hooks/use-auth';

// ─── Types ────────────────────────────────────────────────────────────────────

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

type ProfileData = {
  smoking:     string;
  drinking:    string;
  dietary:     string;
  gender:      string;
  ethnicity:   string;
  dateOfBirth: string;
  bio:         string;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({ icon: Icon, title, children }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-sky-600" />
        </div>
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function ChipGroup({
  options,
  value,
  onChange,
  required = false,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          // Required chip groups: re-clicking the selected option does nothing
          // so users cannot accidentally clear a mandatory field.
          onClick={() => onChange(required && value === o ? o : o)}
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

function DobInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (iso: string) => void;
}) {
  const dayRef  = useRef<HTMLInputElement>(null);
  const yearRef = useRef<HTMLInputElement>(null);

  const init = value ? value.split('-') : ['', '', ''];
  const [mm, setMm]     = useState(init[1] ?? '');
  const [dd, setDd]     = useState(init[2] ?? '');
  const [yyyy, setYyyy] = useState(init[0] ?? '');

  // Sync local parts when the parent value changes (e.g. after async profile load)
  const prevValue = useRef(value);
  useEffect(() => {
    if (value !== prevValue.current) {
      prevValue.current = value;
      const parts = value ? value.split('-') : ['', '', ''];
      setYyyy(parts[0] ?? '');
      setMm(parts[1] ?? '');
      setDd(parts[2] ?? '');
    }
  }, [value]);

  const push = (month: string, day: string, year: string) => {
    if (month && day && year.length === 4) {
      onChange(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    } else {
      onChange('');
    }
  };

  const base = 'border border-gray-200 bg-white rounded-lg text-sm text-center font-semibold ' +
    'text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition py-2 px-1';

  return (
    <div className="flex items-center gap-2">
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
        className={`${base} w-14`}
      />
      <span className="text-gray-300 font-light text-lg select-none">/</span>
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
        className={`${base} w-14`}
      />
      <span className="text-gray-300 font-light text-lg select-none">/</span>
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
        className={`${base} w-20`}
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading]   = useState(true);
  const [isSaving, setIsSaving]     = useState(false);
  const [saved, setSaved]           = useState(false);

  const [form, setForm] = useState<ProfileData>({
    smoking:     '',
    drinking:    '',
    dietary:     '',
    gender:      '',
    ethnicity:   '',
    dateOfBirth: '',
    bio:         '',
  });

  const set = (key: keyof ProfileData, val: string) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  // Load existing profile
  const loadProfile = useCallback(async () => {
    try {
      const res  = await fetch('/api/profile');
      const data = await res.json();
      if (data.profile) {
        const p = data.profile;
        setForm({
          smoking:     p.smoking     ?? '',
          drinking:    p.drinking    ?? '',
          dietary:     p.dietary     ?? '',
          gender:      p.gender      ?? '',
          ethnicity:   p.ethnicity   ?? '',
          dateOfBirth: p.dateOfBirth
            ? new Date(p.dateOfBirth).toISOString().split('T')[0]
            : '',
          bio:         p.bio         ?? '',
        });
      }
    } catch {
      // no-op — fresh form
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaved(false);
    try {
      const body = {
        smoking:     form.smoking     || null,
        drinking:    form.drinking    || null,
        dietary:     form.dietary     || null,
        gender:      form.gender      || null,
        ethnicity:   form.ethnicity   || null,
        dateOfBirth: form.dateOfBirth || null,
        bio:         form.bio         || null,
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

      setSaved(true);
      toast({ title: 'Profile updated', description: 'Your profile is now visible to other members.' });
      setTimeout(() => setSaved(false), 3000);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow">
            <User className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="text-sm text-gray-500">
              {user?.name || user?.email} — visible to other members when you post or chat
            </p>
          </div>
        </div>
        <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-3">
          Fields marked <span className="font-semibold">*</span> are required. Ethnicity and bio are optional.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="space-y-5"
      >
        {/* Lifestyle */}
        <SectionCard icon={Cigarette} title="Smoking *">
          <ChipGroup
            options={SMOKING_OPTIONS}
            value={form.smoking}
            onChange={(v) => set('smoking', v)}
            required
          />
        </SectionCard>

        <SectionCard icon={Wine} title="Drinking *">
          <ChipGroup
            options={DRINKING_OPTIONS}
            value={form.drinking}
            onChange={(v) => set('drinking', v)}
            required
          />
        </SectionCard>

        <SectionCard icon={Utensils} title="Dietary Preference *">
          <ChipGroup
            options={DIETARY_OPTIONS}
            value={form.dietary}
            onChange={(v) => set('dietary', v)}
            required
          />
        </SectionCard>

        {/* Demographics */}
        <SectionCard icon={PersonStanding} title="Gender *">
          <ChipGroup
            options={GENDER_OPTIONS}
            value={form.gender}
            onChange={(v) => set('gender', v)}
            required
          />
        </SectionCard>

        <SectionCard icon={Globe2} title="Ethnicity">
          <input
            type="text"
            maxLength={80}
            placeholder="e.g. South Asian, Hispanic, East Asian…"
            value={form.ethnicity}
            onChange={(e) => set('ethnicity', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
          />
          <p className="text-xs text-gray-400 mt-1">Optional · free text · max 80 characters</p>
        </SectionCard>

        <SectionCard icon={CalendarDays} title="Date of Birth *">
          <DobInput value={form.dateOfBirth} onChange={(v) => set('dateOfBirth', v)} />
          <p className="text-xs text-gray-400 mt-2">
            Format: MM / DD / YYYY &nbsp;·&nbsp; Only your <strong>age</strong> is shown to other members.
          </p>
        </SectionCard>

        <SectionCard icon={BookOpen} title="Short Bio">
          <textarea
            maxLength={300}
            rows={4}
            placeholder="Tell potential roommates a little about yourself…"
            value={form.bio}
            onChange={(e) => set('bio', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 resize-y focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
          />
          <p className="text-right text-xs text-gray-400 mt-0.5">{form.bio.length}/300</p>
        </SectionCard>

        {/* Save */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            isLoading={isSaving}
            className="min-w-[140px] font-semibold"
          >
            {saved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2 text-green-300" />
                Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
