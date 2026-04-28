'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { Home, Building2, Warehouse, Building, ExternalLink, MapPin, X } from 'lucide-react';
import Link from 'next/link';
import { formatRelativeTime, formatLocalTimestamp } from '@/lib/utils';

const LIBRARIES: ('places')[] = ['places'];

interface MapPost {
  id: string;
  title?: string;
  propertyType: string;
  formattedAddress: string;
  city: string;
  country?: string;
  rent?: number | null;
  latitude: number;
  longitude: number;
  createdAt: string;
  expiresAt: string;
  manualPin?: boolean;
  user: { displayName?: string | null; uniqueUserId: string };
}

interface MapViewProps {
  posts: MapPost[];
  country?: string | null;
  state?: string | null;
}

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  styles: [
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  ],
};

const PROPERTY_ICONS: Record<string, React.ElementType> = {
  APARTMENT: Building2,
  SINGLE_HOME: Home,
  TOWNHOME: Warehouse,
  CONDO: Building,
};

const PROPERTY_LABEL: Record<string, string> = {
  APARTMENT: 'Apartment',
  SINGLE_HOME: 'Single Home',
  TOWNHOME: 'Townhome',
  CONDO: 'Condo',
};

function formatRent(rent: number | null | undefined): string {
  if (rent == null) return 'Rent not specified';
  return `$${rent.toLocaleString()}/mo`;
}

// Group posts that share rounded coordinates (same building/address)
function groupByLocation(posts: MapPost[]): Map<string, MapPost[]> {
  const groups = new Map<string, MapPost[]>();
  for (const post of posts) {
    if (post.latitude == null || post.longitude == null) continue;
    if (post.latitude === 0 && post.longitude === 0) continue;
    const key = `${post.latitude.toFixed(5)},${post.longitude.toFixed(5)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(post);
  }
  return groups;
}

import { COUNTRY_CENTERS, STATE_CENTERS, getRegionCenter } from '@/lib/geo-centers';

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 }; // continental USA fallback

// Build a pin-shaped SVG icon. Count is always displayed in the pin head.
function buildPinIcon(count: number, manualPin = false): google.maps.Icon {
  // Manual pins: warm amber tone so they're visually distinct but not jarring
  const color = manualPin
    ? (count > 1 ? '#b45309' : '#d97706')
    : (count > 1 ? '#0284c7' : '#0ea5e9');
  const fontSize = count > 99 ? 9 : count > 9 ? 11 : 13;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.35)"/>
        </filter>
      </defs>
      <path filter="url(#shadow)"
            d="M17 1 C8.7 1 2 7.7 2 16 c0 11 15 26 15 26 s15 -15 15 -26 c0 -8.3 -6.7 -15 -15 -15 z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="17" cy="16" r="9" fill="white"/>
      <text x="17" y="16" text-anchor="middle" dominant-baseline="central"
            font-family="Arial, sans-serif" font-weight="700" font-size="${fontSize}" fill="${color}">${count}</text>
    </svg>
  `.trim();
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(34, 44),
    anchor: new google.maps.Point(17, 42), // tip of the pin sits on the location
  };
}

export function MapView({ posts, country, state }: MapViewProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    // Match the address-input loader so cached scripts stay consistent and
    // marker info-windows render the same English strings stored on the post.
    language: 'en',
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markersRef = useRef<Array<{ remove: () => void; marker: google.maps.Marker }>>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const initialCenteredRef = useRef(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported'>('idle');

  // Request the user's location once on mount so we can default the map to their area
  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      setGeoStatus('unsupported');
      return;
    }
    setGeoStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus('granted');
      },
      () => {
        setGeoStatus('denied');
      },
      { timeout: 10000, maximumAge: 5 * 60 * 1000 }
    );
  }, []);

  const groups = useMemo(() => groupByLocation(posts), [posts]);

  // Map always starts at the selected country; the filter-driven useEffect handles zoom/center.
  const center = COUNTRY_CENTERS[country ?? ''] ?? DEFAULT_CENTER;
  const initialZoom = country ? (COUNTRY_CENTERS[country]?.zoom ?? 4) : 2;

  // Selected posts (shown in left sidebar)
  const selectedPosts = selectedKey ? groups.get(selectedKey) ?? null : null;

  // (Re)build markers whenever groups change AND the map is ready
  useEffect(() => {
    if (!isLoaded || !map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (groups.size === 0) return;

    groups.forEach((groupPosts, key) => {
      const [latStr, lngStr] = key.split(',');
      const position = { lat: parseFloat(latStr), lng: parseFloat(lngStr) };
      const count = groupPosts.length;
      const label =
        count > 1
          ? `${count} listings at this address`
          : groupPosts[0].title || 'Listing';

      const allManual = groupPosts.every((p) => p.manualPin);

      const marker = new google.maps.Marker({
        map,
        position,
        title: label,
        icon: buildPinIcon(count, allManual),
      });

      const listener = marker.addListener('click', () => {
        setSelectedKey(key);
        // pan map to the marker
        map.panTo(position);
      });

      markersRef.current.push({
        remove: () => {
          google.maps.event.removeListener(listener);
          marker.setMap(null);
        },
        marker,
      });
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
    };
  }, [groups, isLoaded, map]);

  // Render a small marker showing the user's own location (only when granted)
  useEffect(() => {
    if (!map || !userLocation) return;
    const dotSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
        <circle cx="11" cy="11" r="10" fill="#3b82f6" fill-opacity="0.18"/>
        <circle cx="11" cy="11" r="6" fill="#3b82f6" stroke="white" stroke-width="2.5"/>
      </svg>
    `.trim();
    const marker = new google.maps.Marker({
      map,
      position: userLocation,
      title: 'Your location',
      zIndex: 9999,
      icon: {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(dotSvg)}`,
        scaledSize: new google.maps.Size(22, 22),
        anchor: new google.maps.Point(11, 11),
      },
    });
    userMarkerRef.current = marker;
    return () => {
      marker.setMap(null);
      userMarkerRef.current = null;
    };
  }, [map, userLocation]);

  // Centre the map whenever the country or state filter changes (or on first load).
  // Priority: state > country > DEFAULT_CENTER. Uses static lookup — no Geocoding API needed.
  useEffect(() => {
    if (!map || !isLoaded) return;

    if (state && country) {
      const s = STATE_CENTERS[country]?.[state];
      if (s) {
        map.setCenter({ lat: s.lat, lng: s.lng });
        map.setZoom(s.zoom);
      } else {
        // State not in lookup → fall back to country center
        const c = COUNTRY_CENTERS[country];
        if (c) { map.setCenter({ lat: c.lat, lng: c.lng }); map.setZoom(c.zoom); }
      }
      initialCenteredRef.current = true;
      return;
    }

    if (country) {
      const c = COUNTRY_CENTERS[country];
      if (c) { map.setCenter({ lat: c.lat, lng: c.lng }); map.setZoom(c.zoom); }
      initialCenteredRef.current = true;
      return;
    }

    map.setCenter(DEFAULT_CENTER);
    map.setZoom(2);
    initialCenteredRef.current = true;
  }, [map, isLoaded, country, state]);

  // When the user closes the side panel, re-apply the filter-based centering.
  useEffect(() => {
    if (!map || !isLoaded || selectedKey) return;
    if (!initialCenteredRef.current) return;

    if (state && country) {
      const s = STATE_CENTERS[country]?.[state];
      if (s) {
        map.setCenter({ lat: s.lat, lng: s.lng });
        map.setZoom(s.zoom);
      } else {
        const c = COUNTRY_CENTERS[country];
        if (c) { map.setCenter({ lat: c.lat, lng: c.lng }); map.setZoom(c.zoom); }
      }
    } else if (country) {
      const c = COUNTRY_CENTERS[country];
      if (c) { map.setCenter({ lat: c.lat, lng: c.lng }); map.setZoom(c.zoom); }
    }
  }, [selectedKey, map, isLoaded, country, state]);

  // Trigger Google Maps resize when the container width changes (when sidebar opens)
  useEffect(() => {
    if (!map) return;
    const t = setTimeout(() => {
      google.maps.event.trigger(map, 'resize');
      // Re-center on the selected position so it doesn't drift
      if (selectedKey) {
        const [lat, lng] = selectedKey.split(',').map(Number);
        map.panTo({ lat, lng });
      }
    }, 250); // matches the CSS transition
    return () => clearTimeout(t);
  }, [selectedKey, map]);

  const onMapLoad = useCallback((m: google.maps.Map) => setMap(m), []);

  if (loadError || !apiKey) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-700 font-medium mb-2">Map unavailable</p>
        <p className="text-sm text-gray-500">
          {!apiKey
            ? 'Google Maps API key is not configured.'
            : 'Failed to load Google Maps. Please try again.'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header strip */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-gray-50">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {posts.filter(p => p.latitude && p.longitude && !(p.latitude === 0 && p.longitude === 0)).length} of {posts.length} listing{posts.length === 1 ? '' : 's'} on map
            {(state || country) && (
              <span className="ml-1.5 font-normal text-gray-500">
                — {[state, country].filter(Boolean).join(', ')}
              </span>
            )}
          </p>
          {selectedPosts ? (
            <p className="text-xs text-sky-600 mt-0.5">
              {selectedPosts.length} listing{selectedPosts.length > 1 ? 's' : ''} selected at this address
            </p>
          ) : posts.length === 0 ? (
            <p className="text-xs text-amber-600 mt-0.5">
              No listings in {[state, country].filter(Boolean).join(', ') || 'this area'} yet — use the State filter above to browse a different region.
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-0.5">
              Showing listings in <span className="font-medium text-gray-700">{[state, country].filter(Boolean).join(', ') || 'selected region'}</span>
              {' '}— change the State filter above to see a different area.
            </p>
          )}
        </div>
        {selectedKey && (
          <button
            onClick={() => setSelectedKey(null)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5 rounded-md hover:bg-white border border-gray-200"
          >
            <X className="w-3.5 h-3.5" />
            Clear selection
          </button>
        )}
      </div>

      {/* Body — split layout when a pin is selected */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          height: 'calc(100vh - 300px)',
          minHeight: '480px',
          width: '100%',
        }}
      >
        {/* Left panel — selected posts */}
        <div
          style={{
            width: selectedPosts ? '380px' : '0px',
            borderRight: selectedPosts ? '1px solid #e5e7eb' : 'none',
            flexShrink: 0,
            overflow: 'hidden',
            background: 'white',
            transition: 'width 200ms ease',
            height: '100%',
          }}
        >
          {selectedPosts && <SelectedPostsPanel posts={selectedPosts} />}
        </div>

        {/* Right — map */}
        <div
          style={{
            flex: '1 1 0%',
            position: 'relative',
            minWidth: 0,
            minHeight: 0,
            height: '100%',
          }}
        >
          {!isLoaded ? (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f9fafb',
              }}
            >
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500">Loading map…</p>
              </div>
            </div>
          ) : (
            <div style={{ position: 'absolute', inset: 0 }}>
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={center}
                zoom={initialZoom}
                options={MAP_OPTIONS}
                onLoad={onMapLoad}
              />
            </div>
          )}

          {/* Empty/no-coords notice */}
          {isLoaded && posts.length > 0 && posts.filter(p => p.latitude && p.longitude && !(p.latitude === 0 && p.longitude === 0)).length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl px-6 py-4 text-center shadow-lg border">
                <p className="text-gray-700 font-medium">No listings have map coordinates yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Listings created with Google Address selection will appear here
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ----- Side panel: scrollable list of posts at the selected location -----

function SelectedPostsPanel({ posts }: { posts: MapPost[] }) {
  // Resolve the address text from the first post (all posts in group share an address)
  const address = posts[0]?.formattedAddress ?? '';
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <div className="px-4 py-3 border-b bg-sky-50">
        <p className="text-[11px] uppercase tracking-wide text-sky-600 font-semibold mb-0.5">Selected address</p>
        <p className="text-sm font-medium text-gray-900 line-clamp-2">{address}</p>
        <p className="text-xs text-gray-500 mt-1">
          {posts.length} listing{posts.length > 1 ? 's' : ''} at this location
        </p>
      </div>

      {/* Scrollable list */}
      <div
        style={{ flex: '1 1 0%', overflowY: 'auto', minHeight: 0 }}
        className="divide-y divide-gray-100"
      >
        {posts.map((post) => {
          const Icon = PROPERTY_ICONS[post.propertyType] || Home;
          return (
            <Link
              key={post.id}
              href={`/accommodation/${post.id}`}
              className="block px-4 py-3.5 hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-sky-100 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-sky-700">
                      {post.title || PROPERTY_LABEL[post.propertyType] || 'Listing'}
                    </p>
                    <ExternalLink className="w-3.5 h-3.5 text-gray-300 group-hover:text-sky-500 flex-shrink-0 mt-0.5" />
                  </div>
                  <p
                    className="text-[11px] text-gray-500 mt-0.5"
                    title={formatLocalTimestamp(post.createdAt)}
                  >
                    {PROPERTY_LABEL[post.propertyType] || post.propertyType}
                    {' · '}
                    {formatRelativeTime(post.createdAt)}
                  </p>
                  <p className="text-sm font-semibold text-sky-600 mt-1.5">{formatRent(post.rent)}</p>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    by {post.user.displayName || `@${post.user.uniqueUserId}`}
                  </p>
                  {post.manualPin && (
                    <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-0.5">
                      <MapPin className="w-2.5 h-2.5 shrink-0" />
                      User manually pinned location on map
                    </p>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
