import type { Request, Response } from 'express';
import { z } from 'zod';
import { AdminService } from '../services/admin.service';
import { catchAsync } from '../utils/catchAsync';

const page = z.coerce.number().int().min(1).max(100_000).default(1);
const pageSize = z.coerce.number().int().min(1).max(100).default(20);
const search = z
  .string()
  .trim()
  .max(100)
  .optional()
  .transform((v) => v || undefined);

export const listUsersSchema = z.object({
  query: z.object({
    search,
    role: z.enum(['USER', 'ADMIN', 'SUPER_ADMIN']).optional(),
    sort: z.enum(['newest', 'oldest', 'xp', 'active', 'name']).default('newest'),
    page,
    pageSize,
  }),
});

export const listProjectsSchema = z.object({
  query: z.object({
    search,
    kind: z.enum(['ai', 'software', 'python', 'hardware']).optional(),
    visibility: z.enum(['public', 'private']).optional(),
    userId: z.string().min(1).optional(),
    page,
    pageSize,
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

// validate() only checks; it does not replace req.query with the parsed (defaulted,
// coerced) values, so parse again here to get typed values.
export const getStats = catchAsync(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await AdminService.getStats() });
});

export const listUsers = catchAsync(async (req: Request, res: Response) => {
  const { query } = listUsersSchema.parse({ query: req.query });
  res.json({ success: true, data: await AdminService.listUsers(query) });
});

export const getUser = catchAsync(async (req: Request, res: Response) => {
  res.json({ success: true, data: await AdminService.getUser(req.params.id as string) });
});

export const listProjects = catchAsync(async (req: Request, res: Response) => {
  const { query } = listProjectsSchema.parse({ query: req.query });
  res.json({ success: true, data: await AdminService.listProjects(query) });
});

export const getProject = catchAsync(async (req: Request, res: Response) => {
  res.json({ success: true, data: await AdminService.getProject(req.params.id as string) });
});
