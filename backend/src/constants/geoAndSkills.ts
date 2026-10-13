/**
 * Canonical source of truth for Indian States, Union Territories, and Trade Skills.
 * Used across backend validation, services, matching logic, and frontend components.
 */

export const INDIAN_STATES = [
  'Andaman and Nicobar Islands',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu and Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Ladakh',
  'Lakshadweep',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Puducherry',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
] as const;

export type IndianState = (typeof INDIAN_STATES)[number];

// Standard common abbreviations and variations mapped to their canonical name
export const INDIAN_STATE_ALIASES: Record<string, IndianState> = {
  an: 'Andaman and Nicobar Islands',
  'andaman & nicobar': 'Andaman and Nicobar Islands',
  'andaman and nicobar': 'Andaman and Nicobar Islands',
  ap: 'Andhra Pradesh',
  'andhra pradesh': 'Andhra Pradesh',
  ar: 'Arunachal Pradesh',
  'arunachal pradesh': 'Arunachal Pradesh',
  as: 'Assam',
  assam: 'Assam',
  br: 'Bihar',
  bihar: 'Bihar',
  ch: 'Chandigarh',
  chandigarh: 'Chandigarh',
  cg: 'Chhattisgarh',
  ct: 'Chhattisgarh',
  chhattisgarh: 'Chhattisgarh',
  'dadra and nagar haveli': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'daman & diu': 'Dadra and Nagar Haveli and Daman and Diu',
  'dadra and nagar haveli and daman and diu': 'Dadra and Nagar Haveli and Daman and Diu',
  dl: 'Delhi',
  delhi: 'Delhi',
  'new delhi': 'Delhi',
  'nct of delhi': 'Delhi',
  ga: 'Goa',
  goa: 'Goa',
  gj: 'Gujarat',
  gujarat: 'Gujarat',
  hr: 'Haryana',
  haryana: 'Haryana',
  hp: 'Himachal Pradesh',
  'himachal pradesh': 'Himachal Pradesh',
  jk: 'Jammu and Kashmir',
  'jammu & kashmir': 'Jammu and Kashmir',
  'jammu and kashmir': 'Jammu and Kashmir',
  jh: 'Jharkhand',
  jharkhand: 'Jharkhand',
  ka: 'Karnataka',
  karnataka: 'Karnataka',
  kl: 'Kerala',
  kerala: 'Kerala',
  la: 'Ladakh',
  ladakh: 'Ladakh',
  ld: 'Lakshadweep',
  lakshadweep: 'Lakshadweep',
  mp: 'Madhya Pradesh',
  'madhya pradesh': 'Madhya Pradesh',
  mh: 'Maharashtra',
  maha: 'Maharashtra',
  maharashtra: 'Maharashtra',
  mn: 'Manipur',
  manipur: 'Manipur',
  ml: 'Meghalaya',
  meghalaya: 'Meghalaya',
  mz: 'Mizoram',
  mizoram: 'Mizoram',
  nl: 'Nagaland',
  nagaland: 'Nagaland',
  od: 'Odisha',
  or: 'Odisha',
  orissa: 'Odisha',
  odisha: 'Odisha',
  py: 'Puducherry',
  pondicherry: 'Puducherry',
  puducherry: 'Puducherry',
  pb: 'Punjab',
  punjab: 'Punjab',
  rj: 'Rajasthan',
  rajasthan: 'Rajasthan',
  sk: 'Sikkim',
  sikkim: 'Sikkim',
  tn: 'Tamil Nadu',
  'tamil nadu': 'Tamil Nadu',
  ts: 'Telangana',
  tg: 'Telangana',
  telangana: 'Telangana',
  tr: 'Tripura',
  tripura: 'Tripura',
  up: 'Uttar Pradesh',
  'uttar pradesh': 'Uttar Pradesh',
  uk: 'Uttarakhand',
  ua: 'Uttarakhand',
  uttarakhand: 'Uttarakhand',
  uttaranchal: 'Uttarakhand',
  wb: 'West Bengal',
  'west bengal': 'West Bengal',
};

/**
 * Returns canonical Indian state name if found, else undefined.
 */
export function normalizeIndianState(val?: string | null): IndianState | undefined {
  if (!val) return undefined;
  const clean = val.trim().toLowerCase();
  if (!clean) return undefined;

  // Direct alias lookup
  if (INDIAN_STATE_ALIASES[clean]) {
    return INDIAN_STATE_ALIASES[clean];
  }

  // Exact match against canonical list (case-insensitive)
  const found = INDIAN_STATES.find((s) => s.toLowerCase() === clean);
  return found;
}

export function isIndianState(val?: string | null): boolean {
  return normalizeIndianState(val) !== undefined;
}

/**
 * Country-to-States registry.
 * Maps 2-letter ISO country codes (and common country names) to their canonical states/provinces.
 */
export const COUNTRY_STATES: Record<string, readonly string[]> = {
  IN: INDIAN_STATES,
  US: [
    'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
    'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho',
    'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine',
    'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
    'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
    'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon',
    'Pennsylvania', 'Puerto Rico', 'Rhode Island', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
    'West Virginia', 'Wisconsin', 'Wyoming',
  ],
  CA: [
    'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
    'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
    'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon',
  ],
  GB: ['England', 'Northern Ireland', 'Scotland', 'Wales'],
  AU: [
    'Australian Capital Territory', 'New South Wales', 'Northern Territory',
    'Queensland', 'South Australia', 'Tasmania', 'Victoria', 'Western Australia',
  ],
  AE: [
    'Abu Dhabi', 'Ajman', 'Dubai', 'Fujairah', 'Ras Al Khaimah', 'Sharjah', 'Umm Al-Quwain',
  ],
  DE: [
    'Baden-Württemberg', 'Bavaria', 'Berlin', 'Brandenburg', 'Bremen', 'Hamburg',
    'Hesse', 'Lower Saxony', 'Mecklenburg-Vorpommern', 'North Rhine-Westphalia',
    'Rhineland-Palatinate', 'Saarland', 'Saxony', 'Saxony-Anhalt',
    'Schleswig-Holstein', 'Thuringia',
  ],
  SG: ['Central Region', 'East Region', 'North Region', 'North-East Region', 'West Region'],
  SA: [
    'Al-Bahah', 'Al-Jawf', 'Al-Qassim', 'Asir', 'Eastern Province', 'Ha\'il',
    'Jazan', 'Madinah', 'Makkah', 'Najran', 'Northern Borders', 'Riyadh', 'Tabuk',
  ],
  MY: [
    'Johor', 'Kedah', 'Kelantan', 'Kuala Lumpur', 'Labuan', 'Malacca',
    'Negeri Sembilan', 'Pahang', 'Penang', 'Perak', 'Perlis', 'Putrajaya',
    'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
  ],
  ZA: [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal', 'Limpopo',
    'Mpumalanga', 'North West', 'Northern Cape', 'Western Cape',
  ],
  BR: [
    'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 'Distrito Federal',
    'Espírito Santo', 'Goiás', 'Maranhão', 'Mato Grosso', 'Mato Grosso do Sul',
    'Minas Gerais', 'Pará', 'Paraíba', 'Paraná', 'Pernambuco', 'Piauí',
    'Rio de Janeiro', 'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia',
    'Roraima', 'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins',
  ],
  MX: [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche', 'Chiapas',
    'Chihuahua', 'Coahuila', 'Colima', 'Durango', 'Guanajuato', 'Guerrero',
    'Hidalgo', 'Jalisco', 'Mexico City', 'Michoacán', 'Morelos', 'Nayarit',
    'Nuevo León', 'Oaxaca', 'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí',
    'Sinaloa', 'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz',
    'Yucatán', 'Zacatecas',
  ],
  ID: [
    'Bali', 'Banten', 'Central Java', 'East Java', 'Jakarta', 'West Java',
    'North Sumatra', 'South Sumatra', 'Riau', 'Yogyakarta', 'West Kalimantan',
    'East Kalimantan', 'South Sulawesi', 'North Sulawesi', 'Papua',
  ],
  PK: [
    'Azad Jammu and Kashmir', 'Balochistan', 'Gilgit-Baltistan',
    'Islamabad Capital Territory', 'Khyber Pakhtunkhwa', 'Punjab', 'Sindh',
  ],
  BD: [
    'Barisal', 'Chittagong', 'Dhaka', 'Khulna', 'Mymensingh', 'Rajshahi', 'Rangpur', 'Sylhet',
  ],
  LK: [
    'Central Province', 'Eastern Province', 'North Central Province',
    'Northern Province', 'North Western Province', 'Sabaragamuwa Province',
    'Southern Province', 'Uva Province', 'Western Province',
  ],
  NP: [
    'Bagmati', 'Gandaki', 'Karnali', 'Koshi', 'Lumbini', 'Madhesh', 'Sudurpashchim',
  ],
  PH: [
    'Bangsamoro', 'Bicol', 'Cagayan Valley', 'Calabarzon', 'Caraga',
    'Central Luzon', 'Central Visayas', 'Cordillera', 'Davao', 'Eastern Visayas',
    'Ilocos', 'Mimaropa', 'National Capital Region (Metro Manila)',
    'Northern Mindanao', 'Soccsksargen', 'Western Visayas', 'Zamboanga Peninsula',
  ],
  JP: [
    'Aichi', 'Chiba', 'Fukuoka', 'Hokkaido', 'Hyogo', 'Kanagawa', 'Kyoto',
    'Osaka', 'Saitama', 'Shizuoka', 'Tokyo',
  ],
  FR: [
    'Auvergne-Rhône-Alpes', 'Bourgogne-Franche-Comté', 'Brittany', 'Centre-Val de Loire',
    'Corsica', 'Grand Est', 'Hauts-de-France', 'Île-de-France', 'Normandy',
    'Nouvelle-Aquitaine', 'Occitanie', 'Pays de la Loire', 'Provence-Alpes-Côte d\'Azur',
  ],
};

const COUNTRY_NAME_TO_CODE: Record<string, string> = {
  INDIA: 'IN',
  'UNITED STATES': 'US',
  USA: 'US',
  'UNITED KINGDOM': 'GB',
  UK: 'GB',
  CANADA: 'CA',
  AUSTRALIA: 'AU',
  'UNITED ARAB EMIRATES': 'AE',
  UAE: 'AE',
  GERMANY: 'DE',
  SINGAPORE: 'SG',
  FRANCE: 'FR',
  'SAUDI ARABIA': 'SA',
  MALAYSIA: 'MY',
  'SOUTH AFRICA': 'ZA',
  BRAZIL: 'BR',
  MEXICO: 'MX',
  INDONESIA: 'ID',
  PAKISTAN: 'PK',
  BANGLADESH: 'BD',
  'SRI LANKA': 'LK',
  NEPAL: 'NP',
  PHILIPPINES: 'PH',
  JAPAN: 'JP',
};

export function getCountryCode(countryOrCode?: string | null): string {
  if (!countryOrCode) return 'IN';
  const clean = countryOrCode.trim().toUpperCase();
  if (COUNTRY_STATES[clean]) return clean;
  return COUNTRY_NAME_TO_CODE[clean] || clean;
}

export function getStatesForCountry(countryOrCode?: string | null): readonly string[] {
  const code = getCountryCode(countryOrCode);
  return COUNTRY_STATES[code] || [];
}

export function hasStatesForCountry(countryOrCode?: string | null): boolean {
  return getStatesForCountry(countryOrCode).length > 0;
}

/**
 * Canonical Trade Skills supported across Craly.
 * Incorporates all manufacturing, engineering, construction, and plant trades.
 */
export const SKILLS = [
  'Arc Welder',
  'Arc Welding',
  'Assembly Fitting',
  'Assembly Line Operations',
  'Assembly Operator',
  'Blueprint Reading',
  'Carpenter',
  'CNC / Machine Operator',
  'CNC Machining',
  'CNC Milling',
  'CNC Operator',
  'Crane & Forklift Operator',
  'Crane Operator',
  'Electrician',
  'Fabrication',
  'Fabrication Fitter',
  'Fitter',
  'Forklift Operation',
  'Forklift Operator',
  'Helper / General Labour',
  'Housekeeping Staff',
  'Hydraulic Technician',
  'Instrumentation Tech',
  'Instrumentation Technician',
  'Inventory Handling',
  'Loader / Unloader',
  'Machine Operator',
  'Mason',
  'Masonry & Civil',
  'MIG Welder',
  'MIG Welding',
  'Packaging',
  'Packing Staff',
  'Painter',
  'Painter & Blaster',
  'Pipe Fitter',
  'Pipe Fitter & Plumber',
  'Plumber',
  'Quality Control (QC)',
  'Quality Inspection',
  'Rigger',
  'Safety Officer & Supervisor',
  'Scaffolder',
  'Security Guard',
  'Sheet Metal Worker',
  'Structural Fitting',
  'Supervisor',
  'TIG Welder',
  'TIG Welding',
  'Turner / Lathe Operator',
  'Welding',
  'Welding (Arc/MIG/TIG)',
] as const;

export type Skill = (typeof SKILLS)[number];

// Popular preset skills for quick-add pills
export const POPULAR_SKILLS: Skill[] = [
  'Welding (Arc/MIG/TIG)',
  'CNC / Machine Operator',
  'Electrician',
  'Fabrication Fitter',
  'Pipe Fitter & Plumber',
  'Assembly Operator',
  'Helper / General Labour',
  'Crane & Forklift Operator',
  'Quality Control (QC)',
  'Safety Officer & Supervisor',
  'Masonry & Civil',
  'Hydraulic Technician',
  'Painter & Blaster',
  'Scaffolder',
];

/**
 * Normalizes skill string to match canonical casing if a match is found.
 */
export function normalizeSkill(val?: string | null): string | undefined {
  if (!val) return undefined;
  const clean = val.trim();
  if (!clean) return undefined;
  const found = SKILLS.find((s) => s.toLowerCase() === clean.toLowerCase());
  return found || clean;
}

export function isSkillValid(val?: string | null): boolean {
  if (!val) return false;
  const clean = val.trim().toLowerCase();
  return SKILLS.some((s) => s.toLowerCase() === clean);
}

/**
 * Canonical Industries and Manufacturing Verticals supported across Craly.
 */
export const INDUSTRIES = [
  'Aerospace & Defence Manufacturing',
  'Automotive & Auto Components',
  'Cement & Building Materials',
  'Chemicals & Petrochemicals',
  'Construction & Infrastructure',
  'Consumer Durables & Electronics',
  'Electrical Equipment & Power Systems',
  'EPC (Engineering, Procurement & Construction)',
  'Fabrication, Machining & Heavy Engineering',
  'Facility & Industrial Plant Maintenance',
  'Food Processing & Agro Industries',
  'Foundry, Forging & Metal Casting',
  'Glass, Ceramics & Refractory',
  'Mining, Minerals & Metals',
  'Oil & Gas / Refinery Operations',
  'Packaging & Printing Industry',
  'Paper, Pulp & Allied Products',
  'PEB & Pre-Engineered Steel Structures',
  'Pharmaceuticals & Healthcare Manufacturing',
  'Plastic, Polymers & Rubber',
  'Renewable Energy & Solar Infrastructure',
  'Steel, Iron & Metallurgy',
  'Textiles, Apparel & Garments',
  'Warehousing, Logistics & Cold Storage',
  'Water Treatment & Environmental Engineering',
] as const;

export type Industry = (typeof INDUSTRIES)[number];

export const POPULAR_INDUSTRIES: Industry[] = [
  'Automotive & Auto Components',
  'Fabrication, Machining & Heavy Engineering',
  'EPC (Engineering, Procurement & Construction)',
  'Construction & Infrastructure',
  'Warehousing, Logistics & Cold Storage',
  'Electrical Equipment & Power Systems',
  'Chemicals & Petrochemicals',
  'Pharmaceuticals & Healthcare Manufacturing',
  'Steel, Iron & Metallurgy',
  'Renewable Energy & Solar Infrastructure',
];

/**
 * Canonical Availability Status options for contractors.
 */
export const AVAILABILITY_STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'AVAILABLE (Open for work)', color: '#059669', badgeBg: '#ecfdf5', dotColor: '#10b981' },
  { value: 'CURRENTLY_AT_CAPACITY', label: 'CURRENTLY AT CAPACITY', color: '#d97706', badgeBg: '#fffbeb', dotColor: '#f59e0b' },
  { value: 'NOT_AVAILABLE', label: 'NOT AVAILABLE', color: '#dc2626', badgeBg: '#fef2f2', dotColor: '#ef4444' },
  { value: 'PAUSED', label: 'PAUSED (Temporarily inactive)', color: '#64748b', badgeBg: '#f8fafc', dotColor: '#94a3b8' },
  { value: 'SUSPENDED', label: 'SUSPENDED (Internal hold)', color: '#991b1b', badgeBg: '#fef2f2', dotColor: '#b91c1c' },
] as const;

export type ContractorAvailabilityStatus = (typeof AVAILABILITY_STATUS_OPTIONS)[number]['value'];

/**
 * Canonical Document Types for contractor compliance and KYC verification.
 */
export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'gst', label: 'GST Registration Certificate', category: 'Statutory', badgeType: 'required' },
  { value: 'business_registration', label: 'Business / Company Registration Certificate', category: 'Statutory', badgeType: 'required' },
  { value: 'pan', label: 'PAN Card (Tax Identification)', category: 'Tax ID', badgeType: 'required' },
  { value: 'aadhaar', label: 'Aadhaar Card (Authorized Signatory)', category: 'Identity', badgeType: 'required' },
  { value: 'labor_license', label: 'Labour License (Contract Labour Act)', category: 'Licensing', badgeType: 'recommended' },
  { value: 'msme', label: 'MSME / Udyam Registration', category: 'Statutory', badgeType: 'optional' },
  { value: 'pf_registration', label: 'EPF Registration Certificate', category: 'Compliance', badgeType: 'recommended' },
  { value: 'esic_registration', label: 'ESIC Registration Certificate', category: 'Compliance', badgeType: 'recommended' },
  { value: 'industry_license', label: 'Factory / Trade / Industry License', category: 'Licensing', badgeType: 'optional' },
  { value: 'safety_certification', label: 'Safety / ISO / Quality Certification', category: 'Certifications', badgeType: 'optional' },
  { value: 'compliance_certificate', label: 'Statutory Compliance Certificate', category: 'Compliance', badgeType: 'optional' },
  { value: 'compliance_report', label: 'Statutory Compliance Audit Report', category: 'Compliance', badgeType: 'optional' },
  { value: 'other_certificate', label: 'Other Trade / Technical Certificate', category: 'Certifications', badgeType: 'optional' },
  { value: 'verification_evidence', label: 'Site Verification Evidence / Audit Note', category: 'Internal', badgeType: 'optional' },
  { value: 'other', label: 'Other Supporting Document', category: 'Supporting', badgeType: 'optional' },
] as const;

export type DocumentTypeOption = (typeof DOCUMENT_TYPE_OPTIONS)[number];

/**
 * Canonical Verification Statuses for Contractor Profiles.
 */
export const VERIFICATION_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending Review', color: '#d97706', badgeBg: '#fffbeb', dotColor: '#f59e0b' },
  { value: 'under_review', label: 'Under Review', color: '#2563eb', badgeBg: '#eff6ff', dotColor: '#3b82f6' },
  { value: 'verified', label: 'Verified', color: '#059669', badgeBg: '#ecfdf5', dotColor: '#10b981' },
  { value: 'needs_changes', label: 'Needs Changes', color: '#c026d3', badgeBg: '#fdf4ff', dotColor: '#d946ef' },
  { value: 'rejected', label: 'Rejected', color: '#dc2626', badgeBg: '#fef2f2', dotColor: '#ef4444' },
] as const;

/**
 * Standard Project / Manpower Requirement Durations.
 */
export const ENGAGEMENT_DURATIONS = [
  '1 Month',
  '2 Months',
  '3 Months',
  '6 Months',
  '9 Months',
  '12 Months (1 Year)',
  'Long-term / Ongoing',
  'Custom Duration',
] as const;

