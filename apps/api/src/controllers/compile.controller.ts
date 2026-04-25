/**
 * compile.controller.ts
 *
 * Single endpoint handler for Arduino code compilation.
 * Pattern identical to auth.controller.ts: schema → catchAsync → service → JSON.
 */
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CompileService, SUPPORTED_BOARDS } from '../services/compile.service';
import { catchAsync } from '../utils/catchAsync';

// ─── Validation Schema ────────────────────────────────────────────────────────

export const compileSchema = z.object({
  body: z.object({
    code: z
      .string()
      .min(1, 'Code cannot be empty')
      .max(50_000, 'Code exceeds the 50KB limit'),
    board: z.enum(SUPPORTED_BOARDS, {
      errorMap: () => ({
        message: `board must be one of: ${SUPPORTED_BOARDS.join(', ')}`,
      }),
    }),
  }),
});

// ─── Handler ──────────────────────────────────────────────────────────────────

export const compileCode = catchAsync(async (req: Request, res: Response) => {
  const result = await CompileService.compile(req.user!.id, {
    code:  req.body.code,
    board: req.body.board,
  });

  res.status(200).json({
    success: true,
    data:    { result },
  });
});
