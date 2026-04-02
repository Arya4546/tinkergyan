import bcrypt from 'bcrypt';
import { SignJWT, jwtVerify } from 'jose';
import crypto from 'node:crypto';
import { env } from '../env';
import { AppError } from '../errors/app-error';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

export class AuthService {
  private static async getSecret() {
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

  static async register(data: any) {
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

    // Store in Redis (30 days = 2592000 seconds)
    await redis.setex(`session:${user.id}`, 2592000, JSON.stringify({ refreshTokenHash: rtHash, lastSeen: Date.now() }));

    return {
      user: { id: user.id, name: user.name, email: user.email, xp: user.xp, level: user.level },
      accessToken,
      refreshToken,
    };
  }

  static async login(data: any) {
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

    await redis.setex(`session:${user.id}`, 2592000, JSON.stringify({ refreshTokenHash: rtHash, lastSeen: Date.now() }));

    return {
      user: { id: user.id, name: user.name, email: user.email, xp: user.xp, level: user.level },
      accessToken,
      refreshToken,
    };
  }

  static async refresh(token: string) {
    if (!token) {
      throw new AppError('UNAUTHORIZED', 'Missing refresh token', 401);
    }

    // A securely generated RT doesn't have the user ID encoded directly, we typically just store it hash -> userId or find it.
    // Wait, the specification explicitly tells us: Key is `session:{userId}`, Value is `{ refreshTokenHash }`
    // If we only receive the refresh token from the cookie, we must figure out the user.
    // Let's change the RT to optionally contain the userId, or we can look it up differently in Redis.
    // By storing a secondary reverse index in Redis: `rt:${rtHash}` -> `userId`
    const rtHash = this.hashRefreshToken(token);
    const userId = await redis.get(`rt:${rtHash}`);

    if (!userId) {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token', 401);
    }

    const sessionRaw = await redis.get(`session:${userId}`);
    if (!sessionRaw) {
      throw new AppError('UNAUTHORIZED', 'Session expired', 401);
    }

    const session = JSON.parse(sessionRaw);
    if (session.refreshTokenHash !== rtHash) {
      // Possible token reuse / hijack
      await redis.del(`session:${userId}`);
      await redis.del(`rt:${rtHash}`);
      throw new AppError('UNAUTHORIZED', 'Invalid token session', 401);
    }

    // Generate new tokens
    const newAccessToken = await this.generateAccessToken(userId);
    const newRefreshToken = this.generateRefreshToken();
    const newRtHash = this.hashRefreshToken(newRefreshToken);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'User not found', 401);
    }

    // Update session
    await redis.setex(`session:${userId}`, 2592000, JSON.stringify({ refreshTokenHash: newRtHash, lastSeen: Date.now() }));
    // Delete old index and set new index
    await redis.del(`rt:${rtHash}`);
    await redis.setex(`rt:${newRtHash}`, 2592000, userId);

    return {
      user: { id: user.id, name: user.name, email: user.email, xp: user.xp, level: user.level },
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  static async logout(userId: string) {
    const sessionRaw = await redis.get(`session:${userId}`);
    if (sessionRaw) {
      const session = JSON.parse(sessionRaw);
      await redis.del(`rt:${session.refreshTokenHash}`);
    }
    await redis.del(`session:${userId}`);
  }

  static async setupSessionIndex(userId: string, refreshToken: string) {
    const rtHash = this.hashRefreshToken(refreshToken);
    await redis.setex(`rt:${rtHash}`, 2592000, userId);
  }
}
