import { User, Prisma } from '@prisma/client';
import { prisma } from '../config/db';
import { ApiError } from '../utils/apiError';
import {
  CreateUserInput,
  UpdateUserInput,
  ListUsersQuery,
} from '../validations/user.validation';
import { PaginatedResult } from '../types';

export class UserService {
  static async createUser(data: CreateUserInput): Promise<User> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw ApiError.conflict(`User with email '${data.email}' already exists`);
    }

    return prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
      },
    });
  }

  static async getUsers(query: ListUsersQuery): Promise<PaginatedResult<User>> {
    const { page, limit, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, items] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { posts: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  static async getUserById(id: string): Promise<User> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        posts: true,
      },
    });

    if (!user) {
      throw ApiError.notFound(`User with id '${id}' not found`);
    }

    return user;
  }

  static async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    // Verify existence first
    await UserService.getUserById(id);

    if (data.email) {
      const existing = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existing && existing.id !== id) {
        throw ApiError.conflict(`Email '${data.email}' is already in use`);
      }
    }

    return prisma.user.update({
      where: { id },
      data,
    });
  }

  static async deleteUser(id: string): Promise<User> {
    // Verify existence first
    await UserService.getUserById(id);

    return prisma.user.delete({
      where: { id },
    });
  }
}
