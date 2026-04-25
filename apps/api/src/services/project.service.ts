/**
 * project.service.ts
 *
 * Business logic for project CRUD operations.
 * All Prisma interactions are explicit, no open transactions.
 * Ownership is enforced at the service layer — controllers never pass raw IDs.
 */
import { AppError } from '../errors/app-error';
import { prisma } from '../lib/prisma';
import type { ProjectType } from '@prisma/client';

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateProjectDto {
  title:       string;
  type:        ProjectType;
  boardTarget: string;
  code?:       string;
  blockState?: string; // JSON-serialized Blockly workspace XML
}

export interface UpdateProjectDto {
  title?:       string;
  code?:        string;
  blockState?:  string;
  boardTarget?: string;
  isPublic?:    boolean;
}

// ─────────────────────────────────────────────────────────────────────────────

export class ProjectService {
  /**
   * List all projects owned by the requesting user, newest first.
   */
  static async findAll(userId: string) {
    return prisma.project.findMany({
      where:   { userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id:          true,
        title:       true,
        type:        true,
        boardTarget: true,
        isPublic:    true,
        forkCount:   true,
        createdAt:   true,
        updatedAt:   true,
        // Omit code and blockState from list view for performance
      },
    });
  }

  /**
   * Fetch a single project by ID.
   * Throws FORBIDDEN if the project belongs to another user (and is not public).
   */
  static async findOne(id: string, userId: string) {
    const project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Project not found', 404);
    }

    if (project.userId !== userId && !project.isPublic) {
      throw new AppError('FORBIDDEN', 'You do not have access to this project', 403);
    }

    return project;
  }

  /**
   * Create a new project owned by the requesting user.
   */
  static async create(userId: string, dto: CreateProjectDto) {
    return prisma.project.create({
      data: {
        userId,
        title:       dto.title,
        type:        dto.type,
        boardTarget: dto.boardTarget,
        code:        dto.code ?? null,
        blockState:  dto.blockState ?? null,
      },
    });
  }

  /**
   * Partially update a project.
   * Ownership is verified before any write occurs.
   */
  static async update(id: string, userId: string, dto: UpdateProjectDto) {
    // Verify ownership first — avoids a wasted UPDATE if unauthorized
    const existing = await prisma.project.findUnique({
      where:  { id },
      select: { userId: true },
    });

    if (!existing) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Project not found', 404);
    }
    if (existing.userId !== userId) {
      throw new AppError('FORBIDDEN', 'You do not own this project', 403);
    }

    return prisma.project.update({
      where: { id },
      data: {
        ...(dto.title       !== undefined && { title: dto.title }),
        ...(dto.code        !== undefined && { code: dto.code }),
        ...(dto.blockState  !== undefined && { blockState: dto.blockState }),
        ...(dto.boardTarget !== undefined && { boardTarget: dto.boardTarget }),
        ...(dto.isPublic    !== undefined && { isPublic: dto.isPublic }),
      },
    });
  }

  /**
   * Permanently delete a project.
   * Ownership is verified before deletion.
   */
  static async delete(id: string, userId: string): Promise<void> {
    const existing = await prisma.project.findUnique({
      where:  { id },
      select: { userId: true },
    });

    if (!existing) {
      throw new AppError('RESOURCE_NOT_FOUND', 'Project not found', 404);
    }
    if (existing.userId !== userId) {
      throw new AppError('FORBIDDEN', 'You do not own this project', 403);
    }

    await prisma.project.delete({ where: { id } });
  }
}
