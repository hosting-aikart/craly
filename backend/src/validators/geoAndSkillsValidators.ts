import { z } from 'zod';
import {
  INDIAN_STATES,
  normalizeIndianState,
  isIndianState,
  SKILLS,
  normalizeSkill,
  isSkillValid,
} from '../constants/geoAndSkills';

export {
  INDIAN_STATES,
  normalizeIndianState,
  isIndianState,
  SKILLS,
  normalizeSkill,
  isSkillValid,
};

/**
 * Required Indian State validator.
 * Accepts canonical name, common alias (e.g. 'MH', 'DL'), or case variations,
 * and canonicalizes it to the official title-cased name.
 */
export const indianStateSchema = z
  .string()
  .trim()
  .min(1, 'State is required')
  .transform((val, ctx) => {
    const norm = normalizeIndianState(val);
    if (!norm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a valid Indian state or union territory',
      });
      return val;
    }
    return norm;
  });

/**
 * Optional Indian State validator.
 * Accepts undefined, null, or empty string. If provided, validates and canonicalizes.
 */
export const optionalIndianStateSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val, ctx) => {
    if (!val || !val.trim()) return undefined;
    const norm = normalizeIndianState(val);
    if (!norm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a valid Indian state or union territory',
      });
      return val.trim();
    }
    return norm;
  });

/**
 * Country-aware state validator for multi-country signup and profiles.
 * Canonicalizes Indian states if matching an Indian state or alias,
 * while cleanly accepting and sanitizing states from other countries.
 */
export const optionalCountryStateSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((val) => {
    if (!val || !val.trim()) return undefined;
    const clean = val.trim();
    const indianNorm = normalizeIndianState(clean);
    if (indianNorm) return indianNorm;
    return clean;
  });

/**
 * Single skill validator.
 */
export const singleSkillSchema = z
  .string()
  .trim()
  .min(1, 'Skill is required')
  .transform((val, ctx) => {
    const norm = normalizeSkill(val);
    if (!norm) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Please select a valid trade skill from the supported list',
      });
      return val;
    }
    return norm;
  });

/**
 * Multi-skill validator.
 * Accepts an array of strings or a comma-separated string,
 * deduplicates, trims, canonicalizes known skills, and filters out empty values.
 */
export const skillsArraySchema = z
  .union([
    z.array(z.string()),
    z.string().transform((str) => str.split(',').map((s) => s.trim()).filter(Boolean)),
  ])
  .transform((rawArray) => {
    const cleaned: string[] = [];
    const seen = new Set<string>();

    for (const item of rawArray) {
      if (typeof item !== 'string') continue;
      const trimmed = item.trim();
      if (!trimmed) continue;
      const normalized = normalizeSkill(trimmed) || trimmed;
      const lower = normalized.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        cleaned.push(normalized);
      }
    }
    return cleaned;
  });

/**
 * Optional multi-skill validator.
 */
export const optionalSkillsArraySchema = z
  .union([
    z.array(z.string()),
    z.string(),
    z.null(),
    z.undefined(),
  ])
  .transform((val) => {
    if (!val) return undefined;
    const arr = Array.isArray(val)
      ? val
      : typeof val === 'string'
      ? val.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
    if (arr.length === 0) return [];

    const cleaned: string[] = [];
    const seen = new Set<string>();
    for (const item of arr) {
      if (typeof item !== 'string') continue;
      const trimmed = item.trim();
      if (!trimmed) continue;
      const normalized = normalizeSkill(trimmed) || trimmed;
      const lower = normalized.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        cleaned.push(normalized);
      }
    }
    return cleaned;
  });
