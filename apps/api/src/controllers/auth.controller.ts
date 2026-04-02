import type { Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../services/auth.service';
import { catchAsync } from '../utils/catchAsync';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    password: z.string().min(8).regex(/[A-Z]/, 'Must contain uppercase').regex(/[0-9]/, 'Must contain number'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string(),
  }),
});

const setCookie = (res: Response, token: string) => {
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
};

export const register = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.register(req.body);
  await AuthService.setupSessionIndex(result.user.id, result.refreshToken);
  setCookie(res, result.refreshToken);
  
  res.status(201).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.login(req.body);
  await AuthService.setupSessionIndex(result.user.id, result.refreshToken);
  setCookie(res, result.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  if (req.user) {
    await AuthService.logout(req.user.id);
  }
  res.clearCookie('refreshToken');
  res.status(200).json({ success: true, data: null });
});

export const refresh = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;
  const result = await AuthService.refresh(token);
  
  setCookie(res, result.refreshToken);

  res.status(200).json({
    success: true,
    data: {
      user: result.user,
      accessToken: result.accessToken,
    },
  });
});

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = req.user!;
  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        avatar: user.avatar,
      },
    },
  });
});
