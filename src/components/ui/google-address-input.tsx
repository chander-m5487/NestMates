'use client';

import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, Loader2 } from 'lucide-react';
import usePlacesAutocomplete, { getDetails } from 'use-places-autocomplete';
import { useLoadScript } from '@react-google-maps/api';

const LIBRARIES: ('places')[] = ['places'];

export interface PlaceResult {
  formattedAddress: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  lat: number;
  lng: number;
}

interface GoogleAddressInputProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect: (result: PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

function extractComponent(
  components: google.maps.GeocoderAddressComponent[],
  type: string
): string {
  return components.find((c) => c.types.includes(type))?.long_name || '';
}

// Inner component — rendered only when Maps script is loaded
function AddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder,
  className = '',
}: GoogleAddressInputProps) {
  const {
    ready,
    value: query,
    suggestions: { status, data },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: { types: ['address'] },
    debounce: 300,
    defaultValue: value,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  const showDropdown = isFocused && status === 'OK' && data.length > 0;

  // Recalculate position whenever dropdown becomes visible or the input moves
  useEffect(() => {
    if (!showDropdown) return;
    const update = () => {
      if (inputRef.current) {
        const r = inputRef.current.getBoundingClientRect();
        setDropdownRect({ top: r.bottom + 6, left: r.left, width: r.width });
      }
    };
    update();
    // Re-position on every animation frame while the dropdown is open so it
    // follows the input if the dialog scrolls or the window resizes.
    let frameId: number;
    const loop = () => { update(); frameId = requestAnimationFrame(loop); };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [showDropdown]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    onChange(e.target.value);
  };

  const handleSelect = async (placeId: string, description: string) => {
    setValue(description, false);
    clearSuggestions();
    onChange(description);

    try {
      const details = await getDetails({
        placeId,
        fields: ['address_components', 'geometry', 'formatted_address'],
      }) as google.maps.places.PlaceResult;

      const components = details.address_components || [];
      const lat = details.geometry?.location?.lat() ?? 0;
      const lng = details.geometry?.location?.lng() ?? 0;
      const formattedAddress = details.formatted_address || description;

      const city =
        extractComponent(components, 'locality') ||
        extractComponent(components, 'postal_town') ||
        extractComponent(components, 'sublocality_level_1') ||
        extractComponent(components, 'sublocality') ||
        extractComponent(components, 'administrative_area_level_3') ||
        extractComponent(components, 'administrative_area_level_2') ||
        extractComponent(components, 'administrative_area_level_1');
      const state   = extractComponent(components, 'administrative_area_level_1');
      const country = extractComponent(components, 'country');
      const zipCode = extractComponent(components, 'postal_code');

      onPlaceSelect({ formattedAddress, city, state, country, zipCode, lat, lng });
    } catch (err) {
      console.error('Places details error:', err);
    }
  };

  return (
    <>
      <div className="relative">
        <MapPin
          className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none transition-colors ${
            isFocused ? 'text-sky-500' : 'text-gray-400'
          }`}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          disabled={!ready}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full pl-10 pr-3 h-10 border rounded-lg text-sm transition-all focus:outline-none bg-white ${
            isFocused
              ? 'border-sky-500 ring-2 ring-sky-500/20'
              : 'border-gray-200 hover:border-gray-300'
          } ${className}`}
        />
      </div>

      {/* Portal dropdown — rendered at body level to escape Dialog overflow clipping */}
      {showDropdown && dropdownRect && typeof document !== 'undefined' &&
        createPortal(
          <ul
            data-address-dropdown=""
            style={{
              position: 'fixed',
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 99999,
              pointerEvents: 'auto',
            }}
            className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto"
          >
            {data.map(({ place_id, description, structured_formatting }) => (
              <li
                key={place_id}
                onMouseDown={() => handleSelect(place_id, description)}
                className="flex items-start px-4 py-3 cursor-pointer hover:bg-sky-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <MapPin className="w-4 h-4 text-sky-400 mt-0.5 mr-3 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {structured_formatting.main_text}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {structured_formatting.secondary_text}
                  </p>
                </div>
              </li>
            ))}
          </ul>,
          document.body
        )}
    </>
  );
}

// Outer component — handles script loading state
export function GoogleAddressInput(props: GoogleAddressInputProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    // Force English place names so country/state strings line up with our
    // server-side allowlist (e.g. "United States" not "Vereinigte Staaten",
    // "Bavaria" not "Bayern"). Without this, listings created in a non-English
    // browser locale would not match the country/state filter dropdowns.
    language: 'en',
  });

  if (loadError || !apiKey) {
    return (
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          placeholder={props.placeholder}
          className={`w-full pl-10 pr-3 h-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white ${props.className}`}
        />
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="relative">
        <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin pointer-events-none" />
        <input
          value=""
          readOnly
          disabled
          placeholder="Loading address search..."
          className={`w-full pl-10 pr-3 h-10 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-400 ${props.className}`}
        />
      </div>
    );
  }

  return <AddressAutocomplete {...props} />;
}
