/**
 * project.controller.ts
 *
 * Thin HTTP handlers for project CRUD.
 * Follows the exact same pattern as auth.controller.ts:
 *   validate(schema) middleware → catchAsync → service → JSON response.
 *
 * No business logic lives here — all decisions are in ProjectService.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { ProjectService } from '../services/project.service';
import { catchAsync } from '../utils/catchAsync';

// ─── Validation Schemas ───────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  body: z.object({
    title: z
      .string()
      .min(1, 'Title is required')
      .max(100, 'Title must be 100 characters or fewer')
      .trim(),
    type: z.enum(['BLOCK', 'CODE'], {
      errorMap: () => ({ message: 'type must be BLOCK or CODE' }),
    }),
    boardTarget: z
      .string()
      .default('arduino:avr:uno'),
    code:       z.string().max(100_000).optional(),
    blockState: z.string().optional(), // Blockly workspace XML string
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: z.object({
    title:       z.string().min(1).max(100).trim().optional(),
    code:        z.string().max(100_000).optional(),
    blockState:  z.string().optional(),
    boardTarget: z.string().optional(),
    isPublic:    z.boolean().optional(),
  }),
});

export const projectIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const listProjects = catchAsync(async (req: Request, res: Response) => {
  const projects = await ProjectService.findAll(req.user!.id);
  res.status(200).json({ success: true, data: { projects } });
});

export const getProject = catchAsync(async (req: Request, res: Response) => {
  const project = await ProjectService.findOne(req.params.id!, req.user!.id);
  res.status(200).json({ success: true, data: { project } });
});

export const createProject = catchAsync(async (req: Request, res: Response) => {
  const project = await ProjectService.create(req.user!.id, req.body);
  res.status(201).json({ success: true, data: { project } });
});

export const updateProject = catchAsync(async (req: Request, res: Response) => {
  const project = await ProjectService.update(req.params.id!, req.user!.id, req.body);
  res.status(200).json({ success: true, data: { project } });
});

export const deleteProject = catchAsync(async (req: Request, res: Response) => {
  await ProjectService.delete(req.params.id!, req.user!.id);
  res.status(200).json({ success: true, data: null });
});
