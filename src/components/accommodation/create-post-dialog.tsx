'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { Home, Building2, Warehouse, Building, Loader2, MapPin, Navigation } from 'lucide-react';
import { getCurrencySymbol } from '@/lib/geo';
import { GoogleAddressInput, type PlaceResult } from '@/components/ui/google-address-input';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { getRegionCenter } from '@/lib/geo-centers';

const LIBRARIES: ('places')[] = ['places'];

interface CreatePostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  activeCountry?: string;
  activeState?: string;
}

const propertyTypes = [
  { value: 'APARTMENT',   label: 'Apartment',   icon: Building2 },
  { value: 'SINGLE_HOME', label: 'Single Home',  icon: Home      },
  { value: 'TOWNHOME',    label: 'Townhome',     icon: Warehouse },
  { value: 'CONDO',       label: 'Condo',        icon: Building  },
];

const emptyForm = {
  title: '',
  propertyType: '',
  address: '',
  city: '',
  state: '',
  country: '',
  zipCode: '',
  lat: null as number | null,
  lng: null as number | null,
  rent: '',
  description: '',
  manualPin: false,
};

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: false,
  clickableIcons: false,
};

export function CreatePostDialog({
  open,
  onOpenChange,
  onSuccess,
  activeCountry,
  activeState,
}: CreatePostDialogProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [manualMode, setManualMode] = useState(false);
  const [pinMoved, setPinMoved] = useState(false);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
  const { isLoaded } = useLoadScript({ googleMapsApiKey: apiKey, libraries: LIBRARIES, language: 'en' });

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  const defaultCenter = getRegionCenter(activeCountry, activeState);
  // Stable object reference — must NOT be recreated on every render (otherwise
  // GoogleMap snaps back to it after every drag), but DOES need to refresh when
  // the user changes their country/state filters between dialog opens. The
  // synced ref + keyed remount below handles both.
  const stableCenter = useRef({ lat: defaultCenter.lat, lng: defaultCenter.lng });
  const regionKey = `${activeCountry ?? ''}-${activeState ?? ''}`;

  const set = (field: string, value: string | number) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!open) {
      setFormData(emptyForm);
      setManualMode(false);
      setPinMoved(false);
    }
  }, [open]);

  useEffect(() => {
    if (manualMode) {
      // Resync stableCenter to the latest filter-derived center every time the
      // user enters manual mode. Without this, the map would always show the
      // country/state that was active when the dialog first mounted.
      stableCenter.current = { lat: defaultCenter.lat, lng: defaultCenter.lng };
      setFormData((prev) => ({
        ...prev,
        state: prev.state || activeState || '',
        country: prev.country || activeCountry || '',
        lat: prev.lat ?? defaultCenter.lat,
        lng: prev.lng ?? defaultCenter.lng,
        manualPin: true,
      }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualMode]);

  const handlePlaceSelect = (result: PlaceResult) => {
    setFormData((prev) => ({
      ...prev,
      address: result.formattedAddress,
      city: result.city,
      state: result.state,
      country: result.country,
      zipCode: result.zipCode,
      lat: result.lat,
      lng: result.lng,
    }));
  };

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      // Guard: if a marker already exists (double-mount), don't create a second one
      if (markerRef.current) {
        markerRef.current.setMap(map);
        mapRef.current = map;
        return;
      }
      mapRef.current = map;
      // Read from stableCenter.current — always reflects the latest filter
      // values because the manualMode effect resyncs it on entry.
      const pinLat = stableCenter.current.lat;
      const pinLng = stableCenter.current.lng;

      const marker = new google.maps.Marker({
        map,
        position: { lat: pinLat, lng: pinLng },
        draggable: true,
        title: 'Drag to your exact location',
        animation: google.maps.Animation.DROP,
      });

      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        if (pos) {
          setFormData((prev) => ({ ...prev, lat: pos.lat(), lng: pos.lng() }));
          setPinMoved(true);
          // Pan map to follow the dropped pin — imperative, no re-render needed
          mapRef.current?.panTo({ lat: pos.lat(), lng: pos.lng() });
        }
      });

      markerRef.current = marker;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.propertyType || !formData.address || !formData.description) {
      toast({ title: 'Missing fields', description: 'Please fill in all required fields.', variant: 'destructive' });
      return;
    }

    const rentVal = parseFloat(String(formData.rent));
    if (!formData.rent || !Number.isFinite(rentVal) || rentVal <= 0) {
      toast({ title: 'Rent required', description: 'Please enter a monthly rent amount.', variant: 'destructive' });
      return;
    }
    if (rentVal > 10_000_000) {
      toast({ title: 'Rent too high', description: 'Please enter a realistic monthly rent (≤ 10,000,000).', variant: 'destructive' });
      return;
    }

    if (formData.lat === null || formData.lng === null) {
      toast({
        title: 'Location required',
        description: manualMode
          ? 'Please drag the pin on the map to your exact location.'
          : 'Please select an address from the Google Maps suggestions dropdown.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/accommodation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          rent: formData.rent ? parseFloat(formData.rent as string) : null,
        }),
      });

      if (response.ok) {
        toast({ title: 'Listing created!', description: 'Your housing listing is now live.' });
        setFormData(emptyForm);
        onSuccess();
      } else {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create listing');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ── Shared form fields (title, property type, rent, description, actions) ──
  const sharedFields = (
    <>
      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title" className="text-sm font-semibold">
          Title * <span className="text-xs font-normal text-muted-foreground">({formData.title.length}/50)</span>
        </Label>
        <Input
          id="title"
          placeholder="e.g., Cozy 2BR near downtown"
          value={formData.title}
          onChange={(e) => set('title', e.target.value.slice(0, 50))}
          maxLength={50}
        />
      </div>

      {/* Property Type */}
      <div className="space-y-1.5">
        <Label className="text-sm font-semibold">Property Type *</Label>
        <div className="grid grid-cols-4 gap-2">
          {propertyTypes.map((type) => (
            <button
              key={type.value}
              type="button"
              onClick={() => set('propertyType', type.value)}
              className={`flex flex-col items-center justify-center gap-1.5 p-3 h-[72px] rounded-xl border-2 text-center transition-all ${
                formData.propertyType === type.value
                  ? 'border-sky-500 bg-sky-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <type.icon className={`w-5 h-5 shrink-0 ${formData.propertyType === type.value ? 'text-sky-600' : 'text-gray-400'}`} />
              <p className={`font-medium text-xs leading-tight text-center ${formData.propertyType === type.value ? 'text-sky-700' : 'text-gray-700'}`}>
                {type.label}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Rent */}
      <div className="space-y-1.5">
        <Label htmlFor="rent" className="text-sm font-semibold">
          Monthly Rent * <span className="font-normal text-gray-400">({getCurrencySymbol(activeCountry)})</span>
        </Label>
        <Input
          id="rent"
          type="number"
          inputMode="numeric"
          min={1}
          max={10000000}
          step={1}
          placeholder={`e.g., ${getCurrencySymbol(activeCountry) === '₹' ? '15,000' : getCurrencySymbol(activeCountry) === 'AED' ? '3,500' : '1,500'}`}
          value={formData.rent as string}
          onChange={(e) => set('rent', e.target.value)}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description" className="text-sm font-semibold">Description *</Label>
        <Textarea
          id="description"
          placeholder="Describe the property — size, availability, house rules, utilities, etc."
          value={formData.description}
          onChange={(e) => set('description', e.target.value)}
          className="min-h-[160px] resize-y"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</> : 'Create Listing'}
        </Button>
      </div>
    </>
  );

  // ── Address toggle link ──
  // Toggling between modes resets only the address-related fields; we keep
  // title, property type, rent, and description so the user doesn't have to
  // re-type them after switching to manual mode (or back).
  const addressToggle = (
    <button
      type="button"
      onClick={() => {
        setManualMode((m) => !m);
        setFormData((prev) => ({
          ...prev,
          address: '', city: '', state: '', country: '', zipCode: '',
          lat: null, lng: null, manualPin: false,
        }));
        setPinMoved(false);
      }}
      className="text-xs text-sky-600 hover:text-sky-800 underline underline-offset-2 transition-colors whitespace-nowrap"
    >
      {manualMode ? '← Back to Google search' : "Can't find your address? Enter manually"}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          manualMode
            ? 'sm:max-w-[1160px] w-[98vw] max-h-[95vh] p-0 overflow-hidden'
            : 'sm:max-w-[520px] max-h-[85vh] overflow-y-auto'
        }
      >
        {/* ── NORMAL MODE (single column) ── */}
        {!manualMode && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl font-display">Post a Housing Listing</DialogTitle>
              <DialogDescription>Fill in your property details. Your listing will be visible for 30 days.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-3">
              {sharedFields.props.children.slice(0, 2)}

              {/* Address — Google Places */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor="address" className="text-sm font-semibold">
                    Address * <span className="text-xs font-normal text-muted-foreground">— start typing, select from Google Maps</span>
                  </Label>
                  {addressToggle}
                </div>
                <GoogleAddressInput
                  value={formData.address}
                  onChange={(v) => setFormData((prev) => ({ ...prev, address: v, lat: null, lng: null, city: '', state: '', country: '', zipCode: '' }))}
                  onPlaceSelect={handlePlaceSelect}
                  placeholder="e.g., 42 Baker Street, London"
                />
                {formData.lat !== null && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {[
                      { label: 'City', value: formData.city },
                      { label: 'State / Province', value: formData.state },
                      { label: 'Country', value: formData.country },
                      { label: 'ZIP / Postal Code', value: formData.zipCode },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: 8, padding: '8px 12px' }}>
                        <div style={{ fontSize: 11, fontWeight: 500, color: '#0ea5e9' }}>{label}</div>
                        <div style={{ fontSize: 13, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value || '—'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {sharedFields.props.children.slice(2)}
            </form>
          </>
        )}

        {/* ── MANUAL MODE (two-column) ── */}
        {manualMode && (
          <div className="flex h-[95vh] max-h-[95vh]">
            {/* Left: scrollable form fields */}
            <div className="w-[36%] min-w-[300px] flex flex-col border-r border-gray-100">
              <div className="px-5 pt-5 pb-3 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Post a Housing Listing</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Your listing will be visible for 30 days.</p>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <form id="manual-form" onSubmit={handleSubmit} className="space-y-4">
                  {sharedFields.props.children.slice(0, 2)}

                  {/* Address fields */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-sm font-semibold">Address *</Label>
                      {addressToggle}
                    </div>
                    <Input
                      placeholder="e.g., Sunrise Apartments, Lake View Road"
                      value={formData.address}
                      onChange={(e) => set('address', e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">City</Label>
                        <Input placeholder="e.g., Hyderabad" value={formData.city} onChange={(e) => set('city', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">ZIP / Postal</Label>
                        <Input placeholder="e.g., 500074" value={formData.zipCode} onChange={(e) => set('zipCode', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">State</Label>
                        <Input placeholder="e.g., Telangana" value={formData.state} onChange={(e) => set('state', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-gray-600">Country</Label>
                        <Input placeholder="e.g., India" value={formData.country} onChange={(e) => set('country', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  {sharedFields.props.children.slice(2)}
                </form>
              </div>
            </div>

            {/* Right: full-height map */}
            <div className="flex-1 flex flex-col min-w-0">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-sky-500" />
                  <span className="text-sm font-semibold text-red-400">Drag the pin to your exact location</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Navigation className="w-3 h-3 shrink-0" />
                  Zoom in and drop the red pin on your building's entrance.
                  {pinMoved
                    ? <span className="ml-1 text-emerald-600 font-medium">✓ Location set.</span>
                    : <span className="ml-1 text-amber-600">Currently at center of {activeState ?? activeCountry ?? 'region'}.</span>
                  }
                </p>
              </div>
              <div className="flex-1">
                {isLoaded ? (
                  <GoogleMap
                    // Remount the map whenever the user's country/state filter
                    // changes between dialog opens — guarantees a fresh center
                    // and a fresh draggable marker each time.
                    key={regionKey}
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={stableCenter.current}
                    zoom={defaultCenter.zoom}
                    options={MAP_OPTIONS}
                    onLoad={onMapLoad}
                    onUnmount={() => {
                      markerRef.current?.setMap(null);
                      markerRef.current = null;
                      mapRef.current = null;
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
