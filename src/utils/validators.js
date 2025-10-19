import { z } from 'zod';

// Report validation schema
export const reportSchema = z.object({
  ngo_id: z.string().min(1, 'NGO ID is required'),
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  people_helped: z.number().int().min(0, 'Must be >= 0'),
  events_conducted: z.number().int().min(0, 'Must be >= 0'),
  funds_utilized: z.number().int().min(0, 'Must be >= 0'),
});

// CSV row validation schema
export const csvRowSchema = z.object({
  ngo_id: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  people_helped: z.number().int().min(0),
  events_conducted: z.number().int().min(0),
  funds_utilized: z.number().int().min(0),
});

// Dashboard query validation
export const dashboardQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
});
