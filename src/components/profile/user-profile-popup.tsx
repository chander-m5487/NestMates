'use client';

/**
 * UserProfilePopup
 * A modal/overlay that shows a public view of another user's profile.
 * Triggered when someone clicks on a post owner's name on a listing card or
 * the detail page.
 *
 * Age is derived server-side (never raw DOB), ethnicity is opt-in by the user.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  Loader2,
  Cigarette,
  Wine,
  Utensils,
  PersonStanding,
  Globe2,
  CalendarDays,
  BookOpen,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PublicProfile {
  smoking:   string | null;
  drinking:  string | null;
  dietary:   string | null;
  gender:    string | null;
  ethnicity: string | null;
  bio:       string | null;
  age:       number | null;
}

interface PublicUser {
  id:          string;
  name:        string | null;
  username:    string | null;
  memberSince: string;
  profile:     PublicProfile | null;
}

interface UserProfilePopupProps {
  userId: string;
  onClose: () => void;
}

// ─── Label helpers ─────────────────────────────────────────────────────────────

const LABEL: Record<string, string> = {
  NEVER: 'Never', OCCASIONALLY: 'Occasionally', REGULARLY: 'Regularly',
  VEG: 'Vegetarian', NON_VEG: 'Non-Vegetarian', EGGETARIAN: 'Eggetarian',
  VEGAN: 'Vegan', OTHER: 'Other',
  MALE: 'Male', FEMALE: 'Female', NON_BINARY: 'Non-binary',
  PREFER_NOT_TO_SAY: 'Prefer not to say',
};

function chip(value: string | null | undefined) {
  if (!value) return null;
  return (
    <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-100">
      {LABEL[value] ?? value}
    </span>
  );
}

function Row({ icon: Icon, label, children }: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-md bg-sky-50 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-3.5 h-3.5 text-sky-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 mb-1">{label}</p>
        <div>{children}</div>
      </div>
    </div>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function UserProfilePopup({ userId, onClose }: UserProfilePopupProps) {
  const [user, setUser]       = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const overlayRef            = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/profile/${encodeURIComponent(userId)}`)
      .then((r) => {
        if (!r.ok) throw new Error('Could not load profile');
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setUser(d.user);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? 'Error loading profile');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const hasProfile = user?.profile && (
    user.profile.smoking || user.profile.drinking || user.profile.dietary ||
    user.profile.gender  || user.profile.ethnicity || user.profile.age ||
    user.profile.bio
  );

  const content = (
    <AnimatePresence>
      <div
        ref={overlayRef}
        className="fixed inset-0 z-[300] flex items-center justify-center p-4"
        style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.93, y: 12 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-sky-600 flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-base">
                  {(user?.name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                {user ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-gray-900">{user.name ?? 'Member'}</p>
                    </div>
                    <p className="text-xs text-gray-400">
                      Member since {new Date(user.memberSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
                    </p>
                  </>
                ) : (
                  <div className="h-4 w-32 bg-gray-100 animate-pulse rounded" />
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">
            {isLoading && (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              </div>
            )}

            {error && (
              <p className="text-sm text-red-500 text-center py-8">{error}</p>
            )}

            {!isLoading && !error && user && (
              <>
                {!hasProfile ? (
                  <div className="text-center py-8">
                    <User className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm text-gray-400">This member hasn't filled in their profile yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {/* Bio */}
                    {user.profile?.bio && (
                      <Row icon={BookOpen} label="About">
                        <p className="text-sm text-gray-700 leading-relaxed">{user.profile.bio}</p>
                      </Row>
                    )}

                    {/* Age */}
                    {user.profile?.age != null && (
                      <Row icon={CalendarDays} label="Age">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-100">
                          {user.profile.age} years old
                        </span>
                      </Row>
                    )}

                    {/* Gender */}
                    {user.profile?.gender && (
                      <Row icon={PersonStanding} label="Gender">
                        {chip(user.profile.gender)}
                      </Row>
                    )}

                    {/* Ethnicity */}
                    {user.profile?.ethnicity && (
                      <Row icon={Globe2} label="Ethnicity">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 text-xs font-semibold border border-sky-100">
                          {user.profile.ethnicity}
                        </span>
                      </Row>
                    )}

                    {/* Dietary */}
                    {user.profile?.dietary && (
                      <Row icon={Utensils} label="Diet">
                        {chip(user.profile.dietary)}
                      </Row>
                    )}

                    {/* Smoking */}
                    {user.profile?.smoking && (
                      <Row icon={Cigarette} label="Smoking">
                        {chip(user.profile.smoking)}
                      </Row>
                    )}

                    {/* Drinking */}
                    {user.profile?.drinking && (
                      <Row icon={Wine} label="Drinking">
                        {chip(user.profile.drinking)}
                      </Row>
                    )}
                  </div>
                )}

              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
}
