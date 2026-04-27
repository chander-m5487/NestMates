import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed Countries
  const countries = [
    { name: 'United States', code: 'US', flag: '🇺🇸', sortOrder: 1 },
    { name: 'Canada', code: 'CA', flag: '🇨🇦', sortOrder: 2 },
    { name: 'United Kingdom', code: 'GB', flag: '🇬🇧', sortOrder: 3 },
    { name: 'Germany', code: 'DE', flag: '🇩🇪', sortOrder: 4 },
    { name: 'Australia', code: 'AU', flag: '🇦🇺', sortOrder: 5 },
  ];

  for (const country of countries) {
    await prisma.country.upsert({
      where: { code: country.code },
      update: {},
      create: country,
    });
  }

  // Seed US States
  const usStates = [
    { name: 'Alabama', code: 'AL' },
    { name: 'Alaska', code: 'AK' },
    { name: 'Arizona', code: 'AZ' },
    { name: 'Arkansas', code: 'AR' },
    { name: 'California', code: 'CA' },
    { name: 'Colorado', code: 'CO' },
    { name: 'Connecticut', code: 'CT' },
    { name: 'Delaware', code: 'DE' },
    { name: 'Florida', code: 'FL' },
    { name: 'Georgia', code: 'GA' },
    { name: 'Hawaii', code: 'HI' },
    { name: 'Idaho', code: 'ID' },
    { name: 'Illinois', code: 'IL' },
    { name: 'Indiana', code: 'IN' },
    { name: 'Iowa', code: 'IA' },
    { name: 'Kansas', code: 'KS' },
    { name: 'Kentucky', code: 'KY' },
    { name: 'Louisiana', code: 'LA' },
    { name: 'Maine', code: 'ME' },
    { name: 'Maryland', code: 'MD' },
    { name: 'Massachusetts', code: 'MA' },
    { name: 'Michigan', code: 'MI' },
    { name: 'Minnesota', code: 'MN' },
    { name: 'Mississippi', code: 'MS' },
    { name: 'Missouri', code: 'MO' },
    { name: 'Montana', code: 'MT' },
    { name: 'Nebraska', code: 'NE' },
    { name: 'Nevada', code: 'NV' },
    { name: 'New Hampshire', code: 'NH' },
    { name: 'New Jersey', code: 'NJ' },
    { name: 'New Mexico', code: 'NM' },
    { name: 'New York', code: 'NY' },
    { name: 'North Carolina', code: 'NC' },
    { name: 'North Dakota', code: 'ND' },
    { name: 'Ohio', code: 'OH' },
    { name: 'Oklahoma', code: 'OK' },
    { name: 'Oregon', code: 'OR' },
    { name: 'Pennsylvania', code: 'PA' },
    { name: 'Rhode Island', code: 'RI' },
    { name: 'South Carolina', code: 'SC' },
    { name: 'South Dakota', code: 'SD' },
    { name: 'Tennessee', code: 'TN' },
    { name: 'Texas', code: 'TX' },
    { name: 'Utah', code: 'UT' },
    { name: 'Vermont', code: 'VT' },
    { name: 'Virginia', code: 'VA' },
    { name: 'Washington', code: 'WA' },
    { name: 'West Virginia', code: 'WV' },
    { name: 'Wisconsin', code: 'WI' },
    { name: 'Wyoming', code: 'WY' },
    { name: 'District of Columbia', code: 'DC' },
  ];

  const usCountry = await prisma.country.findUnique({ where: { code: 'US' } });
  if (usCountry) {
    for (const state of usStates) {
      await prisma.state.upsert({
        where: { countryId_code: { countryId: usCountry.id, code: state.code } },
        update: {},
        create: { ...state, countryId: usCountry.id },
      });
    }
  }

  // Seed Canadian Provinces
  const canadaProvinces = [
    { name: 'Alberta', code: 'AB' },
    { name: 'British Columbia', code: 'BC' },
    { name: 'Manitoba', code: 'MB' },
    { name: 'New Brunswick', code: 'NB' },
    { name: 'Newfoundland and Labrador', code: 'NL' },
    { name: 'Nova Scotia', code: 'NS' },
    { name: 'Ontario', code: 'ON' },
    { name: 'Prince Edward Island', code: 'PE' },
    { name: 'Quebec', code: 'QC' },
    { name: 'Saskatchewan', code: 'SK' },
    { name: 'Northwest Territories', code: 'NT' },
    { name: 'Nunavut', code: 'NU' },
    { name: 'Yukon', code: 'YT' },
  ];

  const caCountry = await prisma.country.findUnique({ where: { code: 'CA' } });
  if (caCountry) {
    for (const province of canadaProvinces) {
      await prisma.state.upsert({
        where: { countryId_code: { countryId: caCountry.id, code: province.code } },
        update: {},
        create: { ...province, countryId: caCountry.id },
      });
    }
  }

  // Seed UK Regions
  const ukRegions = [
    { name: 'England', code: 'ENG' },
    { name: 'Scotland', code: 'SCT' },
    { name: 'Wales', code: 'WLS' },
    { name: 'Northern Ireland', code: 'NIR' },
    { name: 'London', code: 'LND' },
    { name: 'South East', code: 'SE' },
    { name: 'South West', code: 'SW' },
    { name: 'East of England', code: 'EE' },
    { name: 'West Midlands', code: 'WM' },
    { name: 'East Midlands', code: 'EM' },
    { name: 'Yorkshire and the Humber', code: 'YH' },
    { name: 'North West', code: 'NW' },
    { name: 'North East', code: 'NE' },
  ];

  const gbCountry = await prisma.country.findUnique({ where: { code: 'GB' } });
  if (gbCountry) {
    for (const region of ukRegions) {
      await prisma.state.upsert({
        where: { countryId_code: { countryId: gbCountry.id, code: region.code } },
        update: {},
        create: { ...region, countryId: gbCountry.id },
      });
    }
  }

  // Seed German States
  const germanStates = [
    { name: 'Baden-Württemberg', code: 'BW' },
    { name: 'Bavaria', code: 'BY' },
    { name: 'Berlin', code: 'BE' },
    { name: 'Brandenburg', code: 'BB' },
    { name: 'Bremen', code: 'HB' },
    { name: 'Hamburg', code: 'HH' },
    { name: 'Hesse', code: 'HE' },
    { name: 'Lower Saxony', code: 'NI' },
    { name: 'Mecklenburg-Vorpommern', code: 'MV' },
    { name: 'North Rhine-Westphalia', code: 'NW' },
    { name: 'Rhineland-Palatinate', code: 'RP' },
    { name: 'Saarland', code: 'SL' },
    { name: 'Saxony', code: 'SN' },
    { name: 'Saxony-Anhalt', code: 'ST' },
    { name: 'Schleswig-Holstein', code: 'SH' },
    { name: 'Thuringia', code: 'TH' },
  ];

  const deCountry = await prisma.country.findUnique({ where: { code: 'DE' } });
  if (deCountry) {
    for (const state of germanStates) {
      await prisma.state.upsert({
        where: { countryId_code: { countryId: deCountry.id, code: state.code } },
        update: {},
        create: { ...state, countryId: deCountry.id },
      });
    }
  }

  // Seed Australian States/Territories
  const australianStates = [
    { name: 'New South Wales', code: 'NSW' },
    { name: 'Victoria', code: 'VIC' },
    { name: 'Queensland', code: 'QLD' },
    { name: 'Western Australia', code: 'WA' },
    { name: 'South Australia', code: 'SA' },
    { name: 'Tasmania', code: 'TAS' },
    { name: 'Australian Capital Territory', code: 'ACT' },
    { name: 'Northern Territory', code: 'NT' },
  ];

  const auCountry = await prisma.country.findUnique({ where: { code: 'AU' } });
  if (auCountry) {
    for (const state of australianStates) {
      await prisma.state.upsert({
        where: { countryId_code: { countryId: auCountry.id, code: state.code } },
        update: {},
        create: { ...state, countryId: auCountry.id },
      });
    }
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

