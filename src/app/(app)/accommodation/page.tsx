'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { AccommodationCard } from '@/components/accommodation/accommodation-card';
import { CreatePostDialog } from '@/components/accommodation/create-post-dialog';
import {
  Search,
  Plus,
  Home,
  Building2,
  Warehouse,
  Building,
  Map,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MapView } from '@/components/accommodation/map-view';
import { resolveCountryAndState, getCurrencySymbol } from '@/lib/geo';

interface AccommodationPost {
  id: string;
  propertyType: string;
  title?: string;
  formattedAddress: string;
  city: string;
  state?: string | null;
  country?: string;
  zipCode?: string;
  latitude: number;
  longitude: number;
  description: string;
  rent?: number;
  manualPin?: boolean;
  createdAt: string;
  expiresAt: string;
  user: {
    id: string;
    uniqueUserId: string;
    displayName: string | null;
  };
}

const propertyTypeIcons: Record<string, React.ReactNode> = {
  APARTMENT:   <Building2 className="w-4 h-4" />,
  SINGLE_HOME: <Home      className="w-4 h-4" />,
  TOWNHOME:    <Warehouse className="w-4 h-4" />,
  CONDO:       <Building  className="w-4 h-4" />,
};

type FilterField = 'city' | 'zip';

const PAGE_SIZE = 15;

/** Custom scrollable state dropdown — shows max 10 items before scrolling. */
function StateDropdown({
  states, value, onChange,
}: { states: string[]; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<string>(value);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const keyBufferRef = useRef('');
  const keyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Sync highlighted with value when opening
  useEffect(() => { if (open) setHighlighted(value); }, [open, value]);

  // Keyboard navigation when open
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Tab') { setOpen(false); return; }
      if (states.length === 0) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        if (highlighted && highlighted !== value) onChange(highlighted);
        setOpen(false);
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const idx = states.indexOf(highlighted);
        const next = e.key === 'ArrowDown'
          ? Math.min((idx < 0 ? -1 : idx) + 1, states.length - 1)
          : Math.max(idx - 1, 0);
        setHighlighted(states[next]);
        scrollItemIntoView(next);
        return;
      }
      // Letter key: buffer for multi-char prefix (e.g. "Ma" → Maryland before Michigan)
      // Skip when modifier keys are held so we don't clobber Cmd+K, Ctrl+L, etc.
      if (
        e.key.length === 1 && /[a-z]/i.test(e.key)
        && !e.metaKey && !e.ctrlKey && !e.altKey
      ) {
        e.preventDefault();
        keyBufferRef.current += e.key.toLowerCase();
        if (keyTimerRef.current) clearTimeout(keyTimerRef.current);
        keyTimerRef.current = setTimeout(() => { keyBufferRef.current = ''; }, 600);
        const prefix = keyBufferRef.current;
        const match = states.find((s) => s.toLowerCase().startsWith(prefix));
        if (match) {
          setHighlighted(match);
          scrollItemIntoView(states.indexOf(match));
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, highlighted, states, value]);

  // Cleanup any pending keystroke-buffer timer on unmount
  useEffect(() => () => {
    if (keyTimerRef.current) clearTimeout(keyTimerRef.current);
  }, []);

  const ITEM_H = 36;
  const MAX_VISIBLE = 10;
  const listHeight = Math.min(states.length, MAX_VISIBLE) * ITEM_H;

  function scrollItemIntoView(idx: number) {
    const el = listRef.current;
    if (!el) return;
    const itemTop = idx * ITEM_H;
    const itemBottom = itemTop + ITEM_H;
    if (itemTop < el.scrollTop) el.scrollTop = itemTop;
    else if (itemBottom > el.scrollTop + el.clientHeight) el.scrollTop = itemBottom - el.clientHeight;
  }

  return (
    <div ref={ref} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          height: '44px', minWidth: '180px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '6px',
          borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white',
          padding: '0 10px 0 12px', fontSize: '14px', fontWeight: 500, color: '#374151',
          cursor: 'pointer', outline: 'none', boxSizing: 'border-box', whiteSpace: 'nowrap',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Select state"
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, zIndex: 999,
            background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', minWidth: '220px',
            height: `${listHeight}px`, overflowY: 'auto',
          }}
        >
          {states.map((s, idx) => {
            const isSelected = s === value;
            const isHighlighted = s === highlighted;
            return (
              <div
                key={s}
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(s); setOpen(false); }}
                onMouseEnter={() => setHighlighted(s)}
                style={{
                  height: `${ITEM_H}px`, display: 'flex', alignItems: 'center',
                  padding: '0 14px', fontSize: '14px', cursor: 'pointer',
                  background: isSelected ? '#eff6ff' : isHighlighted ? '#dbeafe' : 'transparent',
                  color: isSelected ? '#1d4ed8' : isHighlighted ? '#1e40af' : '#374151',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {isSelected
                  ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}><polyline points="20 6 9 17 4 12" /></svg>
                  : <span style={{ width: '20px', flexShrink: 0 }} />
                }
                {s}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AccommodationPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Resolve country + state from URL — falls back to USA + Alabama if missing
  // or invalid. We pass the *names* to the API since posts store names too.
  const { country, state } = useMemo(
    () =>
      resolveCountryAndState(
        searchParams.get('country'),
        searchParams.get('state')
      ),
    [searchParams]
  );

  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1);

  const [posts, setPosts] = useState<AccommodationPost[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // City/ZIP free-text filter — auto-detected: all-digit input → ZIP, else city.
  // Read whichever of city/zip is currently set in the URL as the initial value.
  const [filterValue, setFilterValue] = useState(() => {
    const f = searchParams.get('filterField');
    return searchParams.get(f === 'zip' ? 'zip' : 'city') ?? '';
  });

  // Keep filterValue in sync when the URL changes externally (e.g. country switch).
  useEffect(() => {
    const f = searchParams.get('filterField');
    const nextValue = searchParams.get(f === 'zip' ? 'zip' : 'city') ?? '';
    setFilterValue((prev) => (prev === nextValue ? prev : nextValue));
  }, [searchParams]);

  const [propertyTypeFilter, setPropertyTypeFilter] = useState(
    searchParams.get('propertyType') ?? ''
  );

  useEffect(() => {
    const next = searchParams.get('propertyType') ?? '';
    setPropertyTypeFilter((prev) => (prev === next ? prev : next));
  }, [searchParams]);

  // Rent range filter
  const [minRent, setMinRent] = useState(searchParams.get('minRent') ?? '');
  const [maxRent, setMaxRent] = useState(searchParams.get('maxRent') ?? '');

  // Sync rent range from URL
  useEffect(() => {
    setMinRent(searchParams.get('minRent') ?? '');
    setMaxRent(searchParams.get('maxRent') ?? '');
  }, [searchParams]);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMap, setShowMap] = useState(false);

  /** Push a partial change into the URL while preserving everything else. */
  const updateUrl = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(patch).forEach(([k, v]) => {
        if (v == null || v === '') params.delete(k);
        else params.set(k, v);
      });
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  // Keep a ref to the latest updateUrl so debounced effects always use a
  // fresh snapshot of searchParams — prevents stale closures from clobbering
  // changes made between debounce schedule and timeout firing.
  const updateUrlRef = useRef(updateUrl);
  useEffect(() => { updateUrlRef.current = updateUrl; }, [updateUrl]);

  // Debounce rent range into URL — skip first mount so a shared URL with
  // ?page=N&minRent=… isn't immediately reset to page 1.
  const rentMountSkipRef = useRef(true);
  useEffect(() => {
    if (rentMountSkipRef.current) { rentMountSkipRef.current = false; return; }
    const handle = setTimeout(() => {
      updateUrlRef.current({ minRent: minRent.trim() || null, maxRent: maxRent.trim() || null, page: '1' });
    }, 400);
    return () => clearTimeout(handle);
  }, [minRent, maxRent]);

  // Debounce the city/zip free-text filter into the URL so it's pageable and
  // shareable. Auto-detect: all-digit input → ZIP filter; anything else → city.
  // Skip first mount so a shared URL with ?city=…&page=3 isn't reset to page 1.
  const filterMountSkipRef = useRef(true);
  useEffect(() => {
    if (filterMountSkipRef.current) { filterMountSkipRef.current = false; return; }
    const handle = setTimeout(() => {
      const v = filterValue.trim();
      const detected: FilterField = v && /^\d+$/.test(v) ? 'zip' : 'city';
      const other: FilterField = detected === 'city' ? 'zip' : 'city';
      updateUrlRef.current({
        filterField: detected,
        [detected]: v || null,
        [other]: null,
        page: '1',
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [filterValue]);

  const fetchPosts = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('country', country.name);
        params.set('state', state);
        if (propertyTypeFilter) params.set('propertyType', propertyTypeFilter);
        const cityQ = searchParams.get('city');
        const zipQ = searchParams.get('zip');
        if (cityQ) params.set('city', cityQ);
        if (zipQ) params.set('zip', zipQ);
        const minR = searchParams.get('minRent');
        const maxR = searchParams.get('maxRent');
        if (minR) params.set('minRent', minR);
        if (maxR) params.set('maxRent', maxR);
        params.set('page', String(page));
        params.set('pageSize', String(PAGE_SIZE));

        const response = await fetch(`/api/accommodation?${params.toString()}`, { signal });
        if (response.ok) {
          const data = await response.json();
          if (signal?.aborted) return;
          setPosts(data.posts ?? []);
          setTotal(data.total ?? 0);
          setTotalPages(data.totalPages ?? 1);
        }
      } catch (error) {
        // Aborted requests are expected when filters change rapidly — swallow them
        if ((error as { name?: string })?.name === 'AbortError') return;
        console.error('Failed to fetch posts:', error);
      } finally {
        if (!signal?.aborted) setIsLoading(false);
      }
    },
    [country.name, state, propertyTypeFilter, page, searchParams]
  );

  // Re-fetch on dependency change. AbortController prevents an older,
  // slower fetch from clobbering the most recent results.
  useEffect(() => {
    const controller = new AbortController();
    fetchPosts(controller.signal);
    return () => controller.abort();
  }, [fetchPosts]);

  const handleStateChange = (next: string) => {
    updateUrl({ state: next, page: '1' });
  };

  const handlePropertyTypeToggle = (type: string) => {
    const next = propertyTypeFilter === type ? '' : type;
    setPropertyTypeFilter(next);
    updateUrl({ propertyType: next || null, page: '1' });
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === page) return;
    updateUrl({ page: String(nextPage) });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Keep listings in sync when the user changes country in the top nav: that
  // triggers a URL update, which causes the searchParams (and our derived
  // `country`) to change, which re-runs `fetchPosts`. No extra wiring needed.

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Housing Listings</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateDialog(true)}
              style={{
                background: 'linear-gradient(135deg, #0284c7, #22d3ee)',
                height: '44px',
                width: '200px',
                padding: '0 20px',
                borderRadius: '12px',
                color: 'white',
                fontWeight: 600,
                fontSize: '17px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                border: 'none',
                boxSizing: 'border-box',
              }}
            >
              <Plus style={{ width: 20, height: 20, flexShrink: 0 }} />
              <span>Post a Listing</span>
            </button>
          </div>
        </div>

        {/* Filters row — inline styles for cross-browser parity (Safari ↔ Chrome) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            width: '100%',
          }}
        >
          {/* State filter — custom scrollable dropdown (max 10 items visible) */}
          <StateDropdown
            states={country.states}
            value={state}
            onChange={handleStateChange}
          />

          {/* Min / Max rent — 1.5× wider, currency symbol per country */}
          <input
            type="number"
            inputMode="numeric"
            placeholder={`Min rent (${getCurrencySymbol(country.name)})`}
            value={minRent}
            onChange={(e) => setMinRent(e.target.value)}
            min={0}
            max={10000000}
            step={1}
            style={{
              height: '44px', width: '150px', flexShrink: 0,
              borderRadius: '10px', border: '1px solid #e5e7eb',
              background: 'white', padding: '0 12px',
              fontSize: '14px', color: '#374151', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <input
            type="number"
            inputMode="numeric"
            placeholder={`Max rent (${getCurrencySymbol(country.name)})`}
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
            min={0}
            max={10000000}
            step={1}
            style={{
              height: '44px', width: '150px', flexShrink: 0,
              borderRadius: '10px', border: '1px solid #e5e7eb',
              background: 'white', padding: '0 12px',
              fontSize: '14px', color: '#374151', outline: 'none',
              boxSizing: 'border-box',
            }}
          />

          {/* City / ZIP search — 270px (1.5× state box) with auto-detect */}
          <div style={{ position: 'relative', width: '270px', flexShrink: 0 }}>
            <Search style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#9ca3af', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search by city or ZIP code…"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              style={{
                width: '100%', height: '44px', paddingLeft: '34px', paddingRight: '12px',
                borderRadius: '10px', border: '1px solid #e5e7eb', background: 'white',
                fontSize: '14px', color: '#111827', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Spacer pushes View on Map to the far right */}
          <div style={{ flex: 1 }} />

          {/* View toggle: Map ↔ List */}
          <button
            onClick={() => setShowMap((prev) => !prev)}
            style={{
              background: 'linear-gradient(135deg, #0284c7, #22d3ee)',
              height: '44px',
              width: '200px',
              flexShrink: 0,
              padding: '0 20px',
              borderRadius: '12px',
              color: 'white',
              fontWeight: 600,
              fontSize: '17px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.25)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              border: 'none',
              boxSizing: 'border-box',
            }}
          >
            {showMap ? (
              <>
                <LayoutGrid style={{ width: 20, height: 20, flexShrink: 0 }} />
                <span>View as List</span>
              </>
            ) : (
              <>
                <Map style={{ width: 20, height: 20, flexShrink: 0 }} />
                <span>View on Map</span>
              </>
            )}
          </button>
        </div>

        {/* Property type quick filter chips */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(propertyTypeIcons).map(([type, icon]) => (
            <button
              key={type}
              onClick={() => handlePropertyTypeToggle(type)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                propertyTypeFilter === type
                  ? 'bg-sky-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {icon}
              {type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase())}
            </button>
          ))}
        </div>

        {/* Body — either map view OR grid of listings */}
        {showMap ? (
          <MapView posts={posts} country={country.name} state={state} />
        ) : isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full mb-4" />
                <div className="h-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <AccommodationCard post={post} />
                </motion.div>
              ))}
            </motion.div>

            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={handlePageChange}
            />
          </>
        ) : (
          <div className="text-center py-14 bg-white rounded-xl border border-gray-200">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Home className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No listings found</h3>
            <p className="text-base text-gray-500 mb-6">
              {filterValue || propertyTypeFilter
                ? `No matches in ${state}, ${country.name}. Try adjusting your filters or switching state.`
                : `Be the first to post a listing in ${state}, ${country.name}.`}
            </p>
            <button
              onClick={() => setShowCreateDialog(true)}
              style={{ background: 'linear-gradient(135deg, #0284c7, #22d3ee)' }}
              className="inline-flex items-center px-8 py-3 rounded-full
                text-white font-semibold text-base shadow-md
                hover:opacity-90 active:opacity-80 transition-opacity"
            >
              <Plus className="w-5 h-5 mr-2.5" />
              Post a Listing
            </button>
          </div>
        )}
      </div>

      <CreatePostDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => { setShowCreateDialog(false); fetchPosts(); }}
        activeCountry={country.name}
        activeState={state}
      />
    </>
  );
}

/**
 * Numbered pagination — Prev / 1 2 3 / Next.
 * Shows up to 7 page buttons (current + 3 on each side); collapses with
 * ellipses for very large result sets.
 */
function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (next: number) => void;
}) {
  if (totalPages <= 1) return null;

  const visible = buildPageList(page, totalPages);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center gap-3 pt-4 pb-2">
      <div className="flex items-center gap-1.5">
        <PageButton
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </PageButton>

        {visible.map((p, i) =>
          typeof p === 'number' ? (
            <PageButton
              key={p}
              active={p === page}
              onClick={() => onChange(p)}
            >
              {p}
            </PageButton>
          ) : (
            <span key={`ellipsis-${i}`} className="px-1.5 text-gray-400 select-none">
              …
            </span>
          )
        )}

        <PageButton
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </PageButton>
      </div>
      <p className="text-xs text-gray-500">
        Showing {start}–{end} of {total}
      </p>
    </div>
  );
}

function PageButton({
  children,
  active,
  disabled,
  onClick,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...rest}
      style={{
        height: '36px',
        minWidth: '36px',
        padding: '0 10px',
        borderRadius: '8px',
        border: active ? '1px solid #0284c7' : '1px solid #e5e7eb',
        background: active
          ? 'linear-gradient(135deg, #0284c7, #22d3ee)'
          : 'white',
        color: active ? 'white' : '#374151',
        fontWeight: 600,
        fontSize: '13px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </button>
  );
}

/**
 * Returns a compact list of page numbers, with `null` representing an ellipsis.
 * Examples (current = 5, total = 20):
 *   [1, null, 4, 5, 6, null, 20]
 */
function buildPageList(current: number, total: number): (number | null)[] {
  const window = 1;
  const pages = new Set<number>([1, total, current]);
  for (let i = 1; i <= window; i++) {
    pages.add(current - i);
    pages.add(current + i);
  }
  const ordered = Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);

  const out: (number | null)[] = [];
  for (let i = 0; i < ordered.length; i++) {
    if (i > 0 && ordered[i] - ordered[i - 1] > 1) out.push(null);
    out.push(ordered[i]);
  }
  return out;
}
