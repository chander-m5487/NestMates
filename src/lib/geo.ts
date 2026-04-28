/**
 * Geographic constants for NestMates.
 *
 * Covers the 12 priority markets where South Asian diaspora housing demand is
 * highest. All `states` arrays are sorted alphabetically so they can be
 * rendered as-is in dropdowns.
 *
 * Adding a new country:
 *   1. Add a COUNTRY_NAME_STATES array below.
 *   2. Add an entry to COUNTRIES.
 *   3. Run `tsc --noEmit` to verify.
 */

export interface Country {
  code: string;        // ISO 3166-1 alpha-2 (e.g., "US")
  name: string;        // Display name (e.g., "United States")
  flag: string;        // Emoji
  states: string[];    // State / province / region names, alphabetical
}

// ─── United States ────────────────────────────────────────────────────────────
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
  'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

// ─── United Kingdom ───────────────────────────────────────────────────────────
const UK_STATES = [
  'England', 'Northern Ireland', 'Scotland', 'Wales',
];

// ─── Canada ───────────────────────────────────────────────────────────────────
const CANADA_STATES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan',
  'Yukon',
];

// ─── India ────────────────────────────────────────────────────────────────────
const INDIA_STATES = [
  'Andaman and Nicobar Islands', 'Andhra Pradesh', 'Arunachal Pradesh',
  'Assam', 'Bihar', 'Chandigarh', 'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Ladakh', 'Lakshadweep', 'Madhya Pradesh',
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Puducherry', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

// ─── Australia ────────────────────────────────────────────────────────────────
const AUSTRALIA_STATES = [
  'Australian Capital Territory',
  'New South Wales',
  'Northern Territory',
  'Queensland',
  'South Australia',
  'Tasmania',
  'Victoria',
  'Western Australia',
];

// ─── United Arab Emirates ─────────────────────────────────────────────────────
const UAE_STATES = [
  'Abu Dhabi',
  'Ajman',
  'Dubai',
  'Fujairah',
  'Ras Al Khaimah',
  'Sharjah',
  'Umm Al Quwain',
];

// ─── Singapore ────────────────────────────────────────────────────────────────
// City-state — uses the 5 planning regions as administrative divisions.
const SINGAPORE_STATES = [
  'Central Region',
  'East Region',
  'North Region',
  'North-East Region',
  'West Region',
];

// ─── Germany ──────────────────────────────────────────────────────────────────
const GERMANY_STATES = [
  'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen',
  'Hamburg', 'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern',
  'North Rhine-Westphalia', 'Rhineland-Palatinate', 'Saarland', 'Saxony',
  'Saxony-Anhalt', 'Schleswig-Holstein', 'Thuringia',
];

// ─── New Zealand ──────────────────────────────────────────────────────────────
const NZ_STATES = [
  'Auckland',
  'Bay of Plenty',
  'Canterbury',
  'Gisborne',
  "Hawke's Bay",
  'Manawatū-Whanganui',
  'Marlborough',
  'Nelson',
  'Northland',
  'Otago',
  'Southland',
  'Taranaki',
  'Tasman',
  'Waikato',
  'Wellington',
  'West Coast',
];

// ─── Ireland ──────────────────────────────────────────────────────────────────
const IRELAND_STATES = [
  'Carlow', 'Cavan', 'Clare', 'Cork', 'Donegal', 'Dublin',
  'Galway', 'Kerry', 'Kildare', 'Kilkenny', 'Laois', 'Leitrim',
  'Limerick', 'Longford', 'Louth', 'Mayo', 'Meath', 'Monaghan',
  'Offaly', 'Roscommon', 'Sligo', 'Tipperary', 'Waterford',
  'Westmeath', 'Wexford', 'Wicklow',
];

// ─── Netherlands ──────────────────────────────────────────────────────────────
const NETHERLANDS_STATES = [
  'Drenthe',
  'Flevoland',
  'Friesland',
  'Gelderland',
  'Groningen',
  'Limburg',
  'North Brabant',
  'North Holland',
  'Overijssel',
  'South Holland',
  'Utrecht',
  'Zeeland',
];

// ─── Sweden ───────────────────────────────────────────────────────────────────
const SWEDEN_STATES = [
  'Blekinge', 'Dalarna', 'Gävleborg', 'Gotland', 'Halland',
  'Jämtland', 'Jönköping', 'Kalmar', 'Kronoberg', 'Norrbotten',
  'Örebro', 'Östergötland', 'Skåne', 'Södermanland', 'Stockholm',
  'Uppsala', 'Värmland', 'Västerbotten', 'Västernorrland',
  'Västmanland', 'Västra Götaland',
];

// ─── Default ──────────────────────────────────────────────────────────────────
export const DEFAULT_COUNTRY_CODE = 'US';

/**
 * The 12 priority markets for NestMates, ordered:
 *   1. United States (default)
 *   2–12. All others alphabetical by display name.
 *
 * Rationale: highest South Asian diaspora concentration, urban housing
 * pressure, card payment feasibility, and English/digital literacy.
 */
export const COUNTRIES: Country[] = [
  { code: 'US', name: 'United States',    flag: '🇺🇸', states: US_STATES },
  { code: 'AU', name: 'Australia',        flag: '🇦🇺', states: AUSTRALIA_STATES },
  { code: 'CA', name: 'Canada',           flag: '🇨🇦', states: CANADA_STATES },
  { code: 'DE', name: 'Germany',          flag: '🇩🇪', states: GERMANY_STATES },
  { code: 'IN', name: 'India',            flag: '🇮🇳', states: INDIA_STATES },
  { code: 'IE', name: 'Ireland',          flag: '🇮🇪', states: IRELAND_STATES },
  { code: 'NL', name: 'Netherlands',      flag: '🇳🇱', states: NETHERLANDS_STATES },
  { code: 'NZ', name: 'New Zealand',      flag: '🇳🇿', states: NZ_STATES },
  { code: 'SG', name: 'Singapore',        flag: '🇸🇬', states: SINGAPORE_STATES },
  { code: 'SE', name: 'Sweden',           flag: '🇸🇪', states: SWEDEN_STATES },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', states: UAE_STATES },
  { code: 'GB', name: 'United Kingdom',   flag: '🇬🇧', states: UK_STATES },
];

const COUNTRY_BY_CODE = new Map<string, Country>(COUNTRIES.map((c) => [c.code, c]));

/** Currency symbol for each supported country (symbol + ISO code). */
export const COUNTRY_CURRENCY: Record<string, { symbol: string; code: string }> = {
  'United States':          { symbol: '$',    code: 'USD' },
  'Australia':              { symbol: 'A$',   code: 'AUD' },
  'Canada':                 { symbol: 'C$',   code: 'CAD' },
  'Germany':                { symbol: '€',    code: 'EUR' },
  'India':                  { symbol: '₹',    code: 'INR' },
  'Ireland':                { symbol: '€',    code: 'EUR' },
  'Netherlands':            { symbol: '€',    code: 'EUR' },
  'New Zealand':            { symbol: 'NZ$',  code: 'NZD' },
  'Singapore':              { symbol: 'S$',   code: 'SGD' },
  'Sweden':                 { symbol: 'kr',   code: 'SEK' },
  'United Arab Emirates':   { symbol: 'AED',  code: 'AED' },
  'United Kingdom':         { symbol: '£',    code: 'GBP' },
};

/** Returns the currency symbol for a country name, falling back to '$'. */
export function getCurrencySymbol(countryName: string | null | undefined): string {
  return COUNTRY_CURRENCY[countryName ?? '']?.symbol ?? '$';
}

export function getCountryByCode(code: string | null | undefined): Country | undefined {
  if (!code) return undefined;
  return COUNTRY_BY_CODE.get(code.toUpperCase());
}

export function getDefaultCountry(): Country {
  return getCountryByCode(DEFAULT_COUNTRY_CODE)!;
}

/**
 * For a given country code, returns the first state alphabetically.
 * Used as the default state when the country changes.
 */
export function getDefaultStateForCountry(code: string | null | undefined): string {
  const country = getCountryByCode(code) ?? getDefaultCountry();
  return country.states[0];
}

/**
 * Test whether the given state belongs to the given country.
 */
export function isStateInCountry(countryCode: string, stateName: string): boolean {
  const country = getCountryByCode(countryCode);
  if (!country) return false;
  return country.states.includes(stateName);
}

/**
 * Resolve a `country` + `state` query-string pair to a normalized, valid pair.
 * Falls back to the default country's first state if either is missing/invalid.
 */
export function resolveCountryAndState(
  rawCountry: string | null | undefined,
  rawState: string | null | undefined,
): { country: Country; state: string } {
  const country = getCountryByCode(rawCountry) ?? getDefaultCountry();
  const state =
    rawState && country.states.includes(rawState)
      ? rawState
      : country.states[0];
  return { country, state };
}

// Case-insensitive lookup tables, built once at module load.
const COUNTRY_BY_NAME = new Map<string, Country>(
  COUNTRIES.map((c) => [c.name.toLowerCase(), c])
);

/**
 * Find a supported country by its display name (case-insensitive).
 */
export function findCountryByName(name: string | null | undefined): Country | undefined {
  if (!name) return undefined;
  return COUNTRY_BY_NAME.get(name.trim().toLowerCase());
}

/**
 * Given a country and a free-text state name, return the canonical state
 * spelling from our allowlist (case-insensitive match), or `null` if not found.
 */
export function findCanonicalState(
  country: Country | undefined,
  stateName: string | null | undefined,
): string | null {
  if (!country || !stateName) return null;
  const target = stateName.trim().toLowerCase();
  return country.states.find((s) => s.toLowerCase() === target) ?? null;
}

/**
 * Normalize a (country, state) pair coming from a post body.
 * Canonical English names are returned for recognized values; unknown
 * regions are kept as-is so unsupported areas can still post.
 */
export function normalizePostCountryAndState(
  rawCountry: string | null | undefined,
  rawState: string | null | undefined,
): { country: string | null; state: string | null } {
  const trimmedCountry = rawCountry?.trim() || null;
  const trimmedState = rawState?.trim() || null;

  const matchedCountry = findCountryByName(trimmedCountry);
  const country = matchedCountry?.name ?? trimmedCountry;

  const canonicalState = findCanonicalState(matchedCountry, trimmedState);
  const state = canonicalState ?? trimmedState;

  return { country, state };
}
