'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SAFETY_POINTS } from '@/lib/safety/notice';

interface SafetyAcknowledgmentProps {
  onAccept: () => void;
  onCancel: () => void;
}

/**
 * Right-pane content that appears the moment a user clicks "Sign Up".
 * The user must scroll to the bottom of the safety notice before the
 * "I have read and understood" checkbox unlocks. Then they click Continue
 * to proceed to the actual signup form.
 *
 * The acknowledgment itself is recorded on the User record by the signup API
 * — we just collect the user's intent here.
 */
export function SafetyAcknowledgment({ onAccept, onCancel }: SafetyAcknowledgmentProps) {
  const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Re-evaluate scroll position so users with very short scroll areas can
  // immediately tick the box (otherwise short content would be a deadlock).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const slack = 8;
      if (el.scrollTop + el.clientHeight + slack >= el.scrollHeight) {
        setHasScrolledToEnd(true);
      }
    };
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const canContinue = hasScrolledToEnd && acknowledged;

  return (
    <motion.div
      key="safety-ack"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col"
      style={{ minHeight: 0 }}
    >
      {/* Header */}
      <div className="text-center mb-3 lg:mb-4">
        <div className="w-12 h-12 lg:w-14 lg:h-14 mx-auto mb-2 lg:mb-3 rounded-full bg-sky-100 flex items-center justify-center">
          <Shield className="w-6 h-6 lg:w-7 lg:h-7 text-sky-600" />
        </div>
        <h2 className="text-xl lg:text-2xl font-display font-bold text-gray-800">
          Before you sign up
        </h2>
        <p className="text-gray-600 mt-1 text-xs lg:text-sm">
          A short read so you stay safe on NestMates.
        </p>
      </div>

      {/* Scrollable list of safety points */}
      <div
        ref={scrollRef}
        style={{
          maxHeight: '320px',
          overflowY: 'auto',
          paddingRight: '6px',
        }}
        className="space-y-2.5 mb-4 border border-gray-100 bg-gray-50 rounded-xl p-3"
      >
        {SAFETY_POINTS.map((point, i) => (
          <div key={i} className="bg-white rounded-lg p-3 border border-gray-100">
            <p className="text-sm font-semibold text-gray-900">{point.title}</p>
            <p className="text-xs lg:text-[13px] text-gray-600 mt-1 leading-relaxed">
              {point.body}
            </p>
          </div>
        ))}

        <div className="text-center pt-1 pb-1">
          <p className="text-[11px] text-gray-400 italic">
            — End of community safety notice —
          </p>
        </div>
      </div>

      {/* Subtle hint while user hasn't scrolled to the bottom */}
      {!hasScrolledToEnd && (
        <p className="text-[11px] text-amber-600 text-center -mt-2 mb-2">
          Please scroll to the end before continuing
        </p>
      )}

      {/* Acknowledgment checkbox */}
      <label
        className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors mb-3 ${
          acknowledged
            ? 'bg-sky-50 border-sky-300'
            : 'bg-white border-gray-200 hover:border-gray-300'
        } ${!hasScrolledToEnd ? 'opacity-60 cursor-not-allowed' : ''}`}
      >
        <input
          type="checkbox"
          checked={acknowledged}
          disabled={!hasScrolledToEnd}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-sky-600 cursor-pointer disabled:cursor-not-allowed"
        />
        <span className="text-xs lg:text-sm text-gray-700 leading-snug">
          I have read and understood the community safety notice. I agree to use
          NestMates respectfully and acknowledge that NestMates is not
          responsible for interactions, agreements, or payments between users.
        </span>
      </label>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1 h-9 lg:h-10 text-xs lg:text-sm font-semibold"
          size="default"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={onAccept}
          disabled={!canContinue}
          className="flex-1 h-9 lg:h-10 text-xs lg:text-sm font-semibold"
          size="default"
        >
          {canContinue ? (
            <>
              Continue
              <ArrowRight className="ml-2 w-3.5 h-3.5 lg:w-4 lg:h-4" />
            </>
          ) : (
            <>
              <Check className="mr-2 w-3.5 h-3.5 lg:w-4 lg:h-4" />
              Continue
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
