import { prisma } from "../../../shared/db-prisma/prismaClient";

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  password?: string;
}

export interface UserFilters {
  name?: string;
  email?: string;
}

// User response without password for API responses
export interface UserResponse {
  id: number;
  name: string;
  email: string;
  createdAt: Date;
  updatedAt: Date;
}

interface WhereInput {
  name?: {
    contains?: string;
    mode?: 'insensitive';
  };
  email?: {
    contains?: string;
    mode?: 'insensitive';
  };
}

export class UserRepository {
  // Helper method to exclude password from user object
  private excludePassword(user: any): UserResponse {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async create(data: CreateUserData): Promise<UserResponse> {
    const user = await prisma.user.create({
      data,
    });
    return this.excludePassword(user);
  }

  async findById(id: number): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user ? this.excludePassword(user) : null;
  }

  async findByIdWithPassword(id: number): Promise<any | null> {
    return await prisma.user.findUnique({
      where: { id },
    });
  }

  async findByEmail(email: string): Promise<UserResponse | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user ? this.excludePassword(user) : null;
  }

  async findByEmailWithPassword(email: string): Promise<any | null> {
    return await prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll(filters?: UserFilters): Promise<UserResponse[]> {
    const where: WhereInput = {};
    
    if (filters?.name) {
      where.name = {
        contains: filters.name,
        mode: 'insensitive',
      };
    }
    
    if (filters?.email) {
      where.email = {
        contains: filters.email,
        mode: 'insensitive',
      };
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return users.map(user => this.excludePassword(user));
  }

  async update(id: number, data: UpdateUserData): Promise<UserResponse> {
    const user = await prisma.user.update({
      where: { id },
      data,
    });
    return this.excludePassword(user);
  }

  async delete(id: number): Promise<UserResponse> {
    const user = await prisma.user.delete({
      where: { id },
    });
    return this.excludePassword(user);
  }

  async count(filters?: UserFilters): Promise<number> {
    const where: WhereInput = {};
    
    if (filters?.name) {
      where.name = {
        contains: filters.name,
        mode: 'insensitive',
      };
    }
    
    if (filters?.email) {
      where.email = {
        contains: filters.email,
        mode: 'insensitive',
      };
    }

    return await prisma.user.count({ where });
  }

  async exists(id: number): Promise<boolean> {
    const count = await prisma.user.count({
      where: { id },
    });
    return count > 0;
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await prisma.user.count({
      where: { email },
    });
    return count > 0;
  }
}
