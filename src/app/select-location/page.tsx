'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { ArrowRight, Globe, MapPin, ChevronLeft, Loader2 } from 'lucide-react';

interface Country {
  id: string;
  name: string;
  code: string;
  flag: string;
}

interface State {
  id: string;
  name: string;
  code: string;
}

const countries: Country[] = [
  { id: '1', name: 'United States', code: 'US', flag: '🇺🇸' },
  { id: '2', name: 'Canada', code: 'CA', flag: '🇨🇦' },
  { id: '3', name: 'United Kingdom', code: 'GB', flag: '🇬🇧' },
  { id: '4', name: 'Germany', code: 'DE', flag: '🇩🇪' },
  { id: '5', name: 'Australia', code: 'AU', flag: '🇦🇺' },
];

export default function SelectLocationPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated, signOut } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedState, setSelectedState] = useState<string>('');
  const [states, setStates] = useState<State[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (selectedCountry) {
      fetchStates(selectedCountry.code);
    }
  }, [selectedCountry]);

  const fetchStates = async (countryCode: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/locations/states?country=${countryCode}`);
      const data = await response.json();
      setStates(data.states || []);
    } catch (error) {
      console.error('Failed to fetch states:', error);
      // Fallback data for demo
      setStates(getDefaultStates(countryCode));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setSelectedState('');
  };

  const handleBack = () => {
    setSelectedCountry(null);
    setSelectedState('');
  };

  const handleContinue = () => {
    if (selectedCountry && selectedState) {
      // Find the selected state name
      const state = states.find(s => s.id === selectedState);
      // Store in localStorage for persistence
      localStorage.setItem('selectedLocation', JSON.stringify({
        country: selectedCountry,
        stateId: selectedState,
        stateName: state?.name || '',
      }));
      router.push('/select-service');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  // Get email username for display
  const getEmailUsername = (email: string | undefined) => {
    if (!email) return 'user';
    return email.split('@')[0];
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-orange-50/30 to-cyan-50/30">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-display font-bold text-gray-900">NestMates</span>
          </div>
          
          {/* User Info & Sign Out */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500">@{getEmailUsername(user?.email)}</p>
              </div>
              <Avatar className="w-9 h-9">
                <AvatarFallback className="bg-primary-100 text-primary-700 font-semibold">
                  {(user?.name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Progress indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className={`w-3 h-3 rounded-full ${selectedCountry ? 'bg-primary-500' : 'bg-primary-500 animate-pulse'}`} />
            <div className={`w-16 h-1 rounded ${selectedCountry ? 'bg-primary-500' : 'bg-gray-200'}`} />
            <div className={`w-3 h-3 rounded-full ${selectedState ? 'bg-primary-500' : 'bg-gray-200'}`} />
            <div className="w-16 h-1 rounded bg-gray-200" />
            <div className="w-3 h-3 rounded-full bg-gray-200" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-10"
          >
            <h1 className="text-3xl lg:text-4xl font-display font-bold text-gray-900 mb-4">
              {selectedCountry ? 'Select Your State/Region' : 'Select Your Country'}
            </h1>
            <p className="text-gray-600 text-lg">
              {selectedCountry
                ? `Choose your state or region in ${selectedCountry.name}`
                : 'Choose the country where you want to find housing, rides, or events'}
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {!selectedCountry ? (
              /* Country Selection Grid */
              <motion.div
                key="countries"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4"
              >
                {countries.map((country, index) => (
                  <motion.button
                    key={country.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleCountrySelect(country)}
                    className="group relative p-6 bg-white rounded-2xl border-2 border-transparent hover:border-primary-500 shadow-sm hover:shadow-lg transition-all duration-300"
                  >
                    <div className="text-5xl mb-3">{country.flag}</div>
                    <h3 className="font-semibold text-gray-900">{country.name}</h3>
                    <div className="absolute inset-0 rounded-2xl bg-primary-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              /* State Selection */
              <motion.div
                key="states"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="max-w-md mx-auto"
              >
                {/* Selected country card */}
                <div className="flex items-center gap-4 mb-8 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                  <button
                    onClick={handleBack}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-3xl">{selectedCountry.flag}</span>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedCountry.name}</p>
                      <p className="text-sm text-gray-500">Selected country</p>
                    </div>
                  </div>
                </div>

                {/* State dropdown */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-5 h-5" />
                    <span className="font-medium">State / Region</span>
                  </div>
                  
                  <Select value={selectedState} onValueChange={setSelectedState}>
                    <SelectTrigger className="h-14 text-base">
                      <SelectValue placeholder="Select your state or region" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map((state) => (
                        <SelectItem key={state.id} value={state.id}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button
                    onClick={handleContinue}
                    disabled={!selectedState}
                    className="w-full"
                    size="lg"
                  >
                    Continue
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// Fallback data for when API is not available
function getDefaultStates(countryCode: string): State[] {
  const statesMap: Record<string, State[]> = {
    US: [
      { id: 'us-ca', name: 'California', code: 'CA' },
      { id: 'us-tx', name: 'Texas', code: 'TX' },
      { id: 'us-ny', name: 'New York', code: 'NY' },
      { id: 'us-fl', name: 'Florida', code: 'FL' },
      { id: 'us-il', name: 'Illinois', code: 'IL' },
      { id: 'us-pa', name: 'Pennsylvania', code: 'PA' },
      { id: 'us-oh', name: 'Ohio', code: 'OH' },
      { id: 'us-ga', name: 'Georgia', code: 'GA' },
      { id: 'us-nc', name: 'North Carolina', code: 'NC' },
      { id: 'us-mi', name: 'Michigan', code: 'MI' },
      { id: 'us-nj', name: 'New Jersey', code: 'NJ' },
      { id: 'us-va', name: 'Virginia', code: 'VA' },
      { id: 'us-wa', name: 'Washington', code: 'WA' },
      { id: 'us-az', name: 'Arizona', code: 'AZ' },
      { id: 'us-ma', name: 'Massachusetts', code: 'MA' },
    ],
    CA: [
      { id: 'ca-on', name: 'Ontario', code: 'ON' },
      { id: 'ca-qc', name: 'Quebec', code: 'QC' },
      { id: 'ca-bc', name: 'British Columbia', code: 'BC' },
      { id: 'ca-ab', name: 'Alberta', code: 'AB' },
      { id: 'ca-mb', name: 'Manitoba', code: 'MB' },
      { id: 'ca-sk', name: 'Saskatchewan', code: 'SK' },
    ],
    GB: [
      { id: 'gb-eng', name: 'England', code: 'ENG' },
      { id: 'gb-sct', name: 'Scotland', code: 'SCT' },
      { id: 'gb-wls', name: 'Wales', code: 'WLS' },
      { id: 'gb-nir', name: 'Northern Ireland', code: 'NIR' },
      { id: 'gb-lnd', name: 'London', code: 'LND' },
    ],
    DE: [
      { id: 'de-by', name: 'Bavaria', code: 'BY' },
      { id: 'de-be', name: 'Berlin', code: 'BE' },
      { id: 'de-nw', name: 'North Rhine-Westphalia', code: 'NW' },
      { id: 'de-bw', name: 'Baden-Württemberg', code: 'BW' },
      { id: 'de-he', name: 'Hesse', code: 'HE' },
      { id: 'de-hh', name: 'Hamburg', code: 'HH' },
    ],
    AU: [
      { id: 'au-nsw', name: 'New South Wales', code: 'NSW' },
      { id: 'au-vic', name: 'Victoria', code: 'VIC' },
      { id: 'au-qld', name: 'Queensland', code: 'QLD' },
      { id: 'au-wa', name: 'Western Australia', code: 'WA' },
      { id: 'au-sa', name: 'South Australia', code: 'SA' },
      { id: 'au-act', name: 'Australian Capital Territory', code: 'ACT' },
    ],
  };
  return statesMap[countryCode] || [];
}
