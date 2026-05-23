/**
 * user.controller.ts
 *
 * HTTP handlers for user profile and preferences CRUD.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { UserService } from '../services/user.service';
import { BadgeService } from '../services/badge.service';
import { catchAsync } from '../utils/catchAsync';

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const updateProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim().optional(),
    avatar: z.string().url().optional(),
  }),
});

export const upsertPreferencesSchema = z.object({
  body: z.object({
    theme: z.enum(['LIGHT', 'DARK', 'SYSTEM']).optional(),
    editorFontSize: z.number().int().min(10).max(28).optional(),
    defaultBoard: z.string().optional(),
    autoSave: z.boolean().optional(),
    codeCompletion: z.boolean().optional(),
    emailNotifications: z.boolean().optional(),
  }),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const getProfile = catchAsync(async (req: Request, res: Response) => {
  const profile = await UserService.getProfile(req.user!.id);
  res.status(200).json({ success: true, data: { profile } });
});

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const profile = await UserService.updateProfile(req.user!.id, req.body);
  res.status(200).json({ success: true, data: { profile } });
});

export const getPreferences = catchAsync(async (req: Request, res: Response) => {
  const preferences = await UserService.getPreferences(req.user!.id);
  res.status(200).json({ success: true, data: { preferences } });
});

export const upsertPreferences = catchAsync(async (req: Request, res: Response) => {
  const preferences = await UserService.upsertPreferences(req.user!.id, req.body);
  res.status(200).json({ success: true, data: { preferences } });
});

export const getLeaderboard = catchAsync(async (_req: Request, res: Response) => {
  const leaderboard = await UserService.getLeaderboard();
  res.status(200).json({ success: true, data: { leaderboard } });
});

export const getBadges = catchAsync(async (req: Request, res: Response) => {
  const badges = await BadgeService.getAll(req.user!.id);
  res.status(200).json({ success: true, data: { badges } });
});

