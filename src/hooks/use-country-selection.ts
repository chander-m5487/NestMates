'use client';

import { useCallback, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  COUNTRIES,
  Country,
  DEFAULT_COUNTRY_CODE,
  getCountryByCode,
  getDefaultStateForCountry,
} from '@/lib/geo';

/**
 * Reads `?country=XX` from the URL (case-insensitive). Falls back to the
 * default country (USA). Provides a setter that writes the new country into
 * the URL and resets `state` to that country's first alphabetical entry.
 *
 * Used by both the top-nav country selector and the listings page (which also
 * reads `?state=...` for its state filter).
 */
export function useCountrySelection() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const country: Country = useMemo(() => {
    const raw = searchParams.get('country');
    return getCountryByCode(raw) ?? getCountryByCode(DEFAULT_COUNTRY_CODE)!;
  }, [searchParams]);

  const setCountry = useCallback(
    (nextCode: string) => {
      const next = getCountryByCode(nextCode);
      if (!next) return;

      // Country is the primary scope for housing listings. When the user
      // picks a new country we always land them on the listings page with a
      // fresh state (the first state alphabetically) — matches the brief
      // "when country is changes the pages starts fresh".
      const isOnListings = pathname.startsWith('/accommodation');
      const params = new URLSearchParams(
        isOnListings ? searchParams.toString() : ''
      );
      params.set('country', next.code);
      params.set('state', getDefaultStateForCountry(next.code));
      // Drop pagination + city/zip filters so we don't carry stale narrow
      // filters into a different country's listings. Also drop the rent range
      // because currencies differ across countries (USD 2000 ≠ INR 2000).
      params.delete('page');
      params.delete('city');
      params.delete('zip');
      params.delete('filterField');
      params.delete('minRent');
      params.delete('maxRent');

      const target = isOnListings ? pathname : '/accommodation';
      router.push(`${target}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return { country, setCountry, allCountries: COUNTRIES };
}
