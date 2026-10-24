import { z } from 'zod';
import { CONTRACTOR_CLASSES, type ContractorClass } from '../constants/contractorClass';

export const contractorClassSchema = z.enum(CONTRACTOR_CLASSES, {
  message: 'Class must be one of: Class I, Class II, Class III, Class IV',
});

export const optionalContractorClassSchema = z
  .union([
    z.enum(CONTRACTOR_CLASSES),
    z.literal('').transform(() => undefined),
    z.null().transform(() => undefined),
    z.undefined(),
  ])
  // Zod 4: a z.undefined() union member doesn't make an object key optional —
  // without this, a body that omits the key fails with "expected nonoptional".
  .optional();
