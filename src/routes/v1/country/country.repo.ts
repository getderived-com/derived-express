import { prisma } from "../../../shared/db-prisma/prismaClient";

export interface Country {
  id: number;
  name: string;
  code: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCountryData {
  name: string;
  code: string;
}

export interface UpdateCountryData {
  name?: string;
  code?: string;
}

export interface CountryFilters {
  name?: string;
  code?: string;
}

interface WhereInput {
  name?: {
    contains?: string;
    mode?: 'insensitive';
  };
  code?: {
    equals?: string;
    mode?: 'insensitive';
  };
}

export class CountryRepository {
  async create(data: CreateCountryData): Promise<Country> {
    return await prisma.country.create({
      data,
    });
  }

  async findById(id: number): Promise<Country | null> {
    return await prisma.country.findUnique({
      where: { id },
    });
  }

  async findByCode(code: string): Promise<Country | null> {
    return await prisma.country.findUnique({
      where: { code },
    });
  }

  async findByName(name: string): Promise<Country | null> {
    return await prisma.country.findUnique({
      where: { name },
    });
  }

  async findAll(filters?: CountryFilters): Promise<Country[]> {
    const where: WhereInput = {};
    
    if (filters?.name) {
      where.name = {
        contains: filters.name,
        mode: 'insensitive',
      };
    }
    
    if (filters?.code) {
      where.code = {
        equals: filters.code,
        mode: 'insensitive',
      };
    }

    return await prisma.country.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async update(id: number, data: UpdateCountryData): Promise<Country> {
    return await prisma.country.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<Country> {
    return await prisma.country.delete({
      where: { id },
    });
  }

  async count(filters?: CountryFilters): Promise<number> {
    const where: WhereInput = {};
    
    if (filters?.name) {
      where.name = {
        contains: filters.name,
        mode: 'insensitive',
      };
    }
    
    if (filters?.code) {
      where.code = {
        equals: filters.code,
        mode: 'insensitive',
      };
    }

    return await prisma.country.count({ where });
  }

  async exists(id: number): Promise<boolean> {
    const count = await prisma.country.count({
      where: { id },
    });
    return count > 0;
  }

  async existsByCode(code: string): Promise<boolean> {
    const count = await prisma.country.count({
      where: { code },
    });
    return count > 0;
  }

  async existsByName(name: string): Promise<boolean> {
    const count = await prisma.country.count({
      where: { name },
    });
    return count > 0;
  }
}
