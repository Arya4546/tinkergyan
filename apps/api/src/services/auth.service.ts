import bcrypt from 'bcrypt';
import { SignJWT } from 'jose';
import crypto from 'node:crypto';
import type { RegisterRequest, LoginRequest } from '@tinkergyan/shared-types';
import { env } from '../env';
import { AppError } from '../errors/app-error';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

export type RegisterDto = RegisterRequest;
export type LoginDto = LoginRequest;

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
}

interface UserSession {
  refreshTokenHash: string;
  oldRefreshTokenHash?: string;
  rotatedAt?: number;
  lastSeen: number;
}

export class AuthService {
  private static async getSecret() {
    await Promise.resolve();
    return new TextEncoder().encode(env.JWT_SECRET);
  }

  private static generateRefreshToken(): string {
    return crypto.randomBytes(40).toString('hex');
  }

  private static hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private static async generateAccessToken(userId: string): Promise<string> {
    const secret = await this.getSecret();
    return new SignJWT({})
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(secret);
  }

  static async register(data: RegisterDto) {
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new AppError('CONFLICT', 'Email already in use', 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
      },
    });

    const accessToken = await this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken();
    const rtHash = this.hashRefreshToken(refreshToken);

    // Store session and index in Redis (30 days = 2592000 seconds)
    const sessionData: UserSession = {
      refreshTokenHash: rtHash,
      lastSeen: Date.now(),
    };
    await redis.setex(`session:${user.id}`, 2592000, JSON.stringify(sessionData));
    await redis.setex(`rt:${rtHash}`, 2592000, user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    };
  }

  static async login(data: LoginDto) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('UNAUTHORIZED', 'Invalid credentials', 401);
    }

    const accessToken = await this.generateAccessToken(user.id);
    const refreshToken = this.generateRefreshToken();
    const rtHash = this.hashRefreshToken(refreshToken);

    // Store session and index in Redis (30 days = 2592000 seconds)
    const sessionData: UserSession = {
      refreshTokenHash: rtHash,
      lastSeen: Date.now(),
    };
    await redis.setex(`session:${user.id}`, 2592000, JSON.stringify(sessionData));
    await redis.setex(`rt:${rtHash}`, 2592000, user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        avatar: user.avatar,
      },
      accessToken,
      refreshToken,
    };
  }

  static async refresh(token: string) {
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'Missing refresh token', 401);
    }

    const rtHash = this.hashRefreshToken(token);
    const userId = await redis.get(`rt:${rtHash}`);

    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token', 401);
    }

    const sessionRaw = await redis.get(`session:${userId}`);
    if (!sessionRaw) {
      throw new AppError('UNAUTHORIZED', 'Session expired', 401);
    }

    const session = JSON.parse(sessionRaw) as UserSession;

    // Check if the provided token matches the current active token
    if (session.refreshTokenHash !== rtHash) {
      // Check if it's the old token within the grace period (10 seconds)
      const isGracePeriod =
        session.oldRefreshTokenHash === rtHash &&
        session.rotatedAt &&
        Date.now() - session.rotatedAt < 10000;

      if (!isGracePeriod) {
        // Possible token reuse / hijack outside grace period -> clear session
        await redis.del(`session:${userId}`);
        await redis.del(`rt:${rtHash}`);
        throw new AppError('UNAUTHORIZED', 'Invalid token session', 401);
      }
    }

    // Generate new tokens
    const newAccessToken = await this.generateAccessToken(userId);
    const newRefreshToken = this.generateRefreshToken();
    const newRtHash = this.hashRefreshToken(newRefreshToken);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'User not found', 401);
    }

    // Update session, keeping the old token hash and rotation time for grace period
    const sessionData: UserSession = {
      refreshTokenHash: newRtHash,
      oldRefreshTokenHash: rtHash,
      rotatedAt: Date.now(),
      lastSeen: Date.now(),
    };
    await redis.setex(`session:${userId}`, 2592000, JSON.stringify(sessionData));

    // Keep old token mapping for 15 seconds to support concurrent request lookup
    await redis.setex(`rt:${rtHash}`, 15, userId);
    await redis.setex(`rt:${newRtHash}`, 2592000, userId);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        avatar: user.avatar,
      },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async logout(userId: string) {
    const sessionRaw = await redis.get(`session:${userId}`);
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw) as UserSession;
      await redis.del(`rt:${session.refreshTokenHash}`);
      if (session.oldRefreshTokenHash) {
        await redis.del(`rt:${session.oldRefreshTokenHash}`);
      }
    }
    await redis.del(`session:${userId}`);
  }

  static async changePassword(userId: string, data: ChangePasswordDto) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError('UNAUTHORIZED', 'User not found', 401);

    const isValid = await bcrypt.compare(data.oldPassword, user.passwordHash);
    if (!isValid) throw new AppError('UNAUTHORIZED', 'Incorrect current password', 401);

    const passwordHash = await bcrypt.hash(data.newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    // Revoke all sessions here
    await this.logout(userId);
  }
}
