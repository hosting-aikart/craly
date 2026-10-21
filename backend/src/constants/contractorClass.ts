/**
 * Canonical contractor classes and eligibility criteria across Craly.
 */

export const CONTRACTOR_CLASSES = [
  'Class I',
  'Class II',
  'Class III',
  'Class IV',
] as const;

export type ContractorClass = (typeof CONTRACTOR_CLASSES)[number];

export function isContractorClass(val: unknown): val is ContractorClass {
  return typeof val === 'string' && CONTRACTOR_CLASSES.includes(val as ContractorClass);
}

export interface ContractorClassEligibility {
  id: ContractorClass;
  title: string;
  bidLimit: string;
  solvency: string;
  turnover: string;
  technicalStaff: string;
}

export const CONTRACTOR_CLASS_DETAILS: Record<ContractorClass, ContractorClassEligibility> = {
  'Class I': {
    id: 'Class I',
    title: 'Class I',
    bidLimit: 'No limit',
    solvency: '₹2.5 crore',
    turnover: '₹5 crore',
    technicalStaff: '2 graduate engineers, 4 diploma holders, 6 ITI or technical assistants',
  },
  'Class II': {
    id: 'Class II',
    title: 'Class II',
    bidLimit: '₹7.5 crore',
    solvency: '₹75 lakh',
    turnover: '₹2 crore',
    technicalStaff: '2 graduate engineers, 4 diploma holders, 6 ITI or technical assistants',
  },
  'Class III': {
    id: 'Class III',
    title: 'Class III',
    bidLimit: '₹3 crore',
    solvency: '₹30 lakh',
    turnover: '₹90 lakh',
    technicalStaff: '1 graduate or diploma engineer, 2 ITI',
  },
  'Class IV': {
    id: 'Class IV',
    title: 'Class IV',
    bidLimit: '₹1.5 crore',
    solvency: '₹15 lakh',
    turnover: '₹60 lakh',
    technicalStaff: '1 graduate or diploma engineer, 2 ITI',
  },
};
