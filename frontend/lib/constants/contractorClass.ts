/**
 * Contractor Classes and Eligibility Criteria for Craly.
 *
 * Source: Official contractor classification requirements.
 * Note: Class I-A is deliberately excluded per specification.
 */

export const CONTRACTOR_CLASSES = [
  'Class I',
  'Class II',
  'Class III',
  'Class IV',
] as const;

export type ContractorClass = (typeof CONTRACTOR_CLASSES)[number];

export interface ContractorClassEligibility {
  id: ContractorClass;
  title: string;
  bidLimit: string;
  solvency: string;
  turnover: string;
  technicalStaff: string;
  badgeColor: string;
  badgeBg: string;
}

export const CONTRACTOR_CLASS_DETAILS: Record<ContractorClass, ContractorClassEligibility> = {
  'Class I': {
    id: 'Class I',
    title: 'Class I',
    bidLimit: 'No limit',
    solvency: '₹2.5 crore',
    turnover: '₹5 crore',
    technicalStaff: '2 graduate engineers, 4 diploma holders, 6 ITI or technical assistants',
    badgeColor: '#059669',
    badgeBg: '#ecfdf5',
  },
  'Class II': {
    id: 'Class II',
    title: 'Class II',
    bidLimit: '₹7.5 crore',
    solvency: '₹75 lakh',
    turnover: '₹2 crore',
    technicalStaff: 'Same as Class I',
    badgeColor: '#2563eb',
    badgeBg: '#eff6ff',
  },
  'Class III': {
    id: 'Class III',
    title: 'Class III',
    bidLimit: '₹3 crore',
    solvency: '₹30 lakh',
    turnover: '₹90 lakh',
    technicalStaff: '1 graduate or diploma engineer, 2 ITI',
    badgeColor: '#d97706',
    badgeBg: '#fffbeb',
  },
  'Class IV': {
    id: 'Class IV',
    title: 'Class IV',
    bidLimit: '₹1.5 crore',
    solvency: '₹15 lakh',
    turnover: '₹60 lakh',
    technicalStaff: '1 graduate or diploma engineer, 2 ITI',
    badgeColor: '#7c3aed',
    badgeBg: '#f5f3ff',
  },
};

export const CONTRACTOR_CLASS_OPTIONS = CONTRACTOR_CLASSES.map((cls) => ({
  value: cls,
  label: cls,
  bidLimit: CONTRACTOR_CLASS_DETAILS[cls].bidLimit,
}));
