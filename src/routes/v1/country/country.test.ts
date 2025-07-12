import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../../express-app';
import { prisma } from '../../../shared/db-prisma/prismaClient';

// Mock the Prisma client
vi.mock('../../../shared/db-prisma/prismaClient', () => ({
  prisma: {
    country: {
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    $connect: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

const mockPrisma = prisma as any;

describe('Country API', () => {
  // Test data
  const validCountryData = {
    name: 'United States',
    code: 'US'
  };

  const validCountryData2 = {
    name: 'Canada',
    code: 'CA'
  };

  const invalidCountryData = {
    name: '', // Invalid: empty name
    code: 'TOOLONG' // Invalid: too long (over 3 characters)
  };

  const mockCountryResponse = {
    id: 1,
    name: 'United States',
    code: 'US',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockCountryResponse2 = {
    id: 2,
    name: 'Canada',
    code: 'CA',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  describe('POST /api/v1/countries', () => {
    it('should create a new country with valid data', async () => {
      // Mock successful creation
      mockPrisma.country.create.mockResolvedValue(mockCountryResponse);
      
      const response = await request(app)
        .post('/api/v1/countries')
        .send(validCountryData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('Country created successfully');
      expect(response.body.result).toMatchObject({
        name: validCountryData.name,
        code: validCountryData.code
      });
      expect(response.body.result.id).toBeDefined();
      expect(response.body.result.createdAt).toBeDefined();
      expect(response.body.result.updatedAt).toBeDefined();

      // Verify the create method was called with correct data
      expect(mockPrisma.country.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: validCountryData.name,
          code: validCountryData.code
        })
      });
    });

    it('should return 400 for invalid country data', async () => {
      const response = await request(app)
        .post('/api/v1/countries')
        .send(invalidCountryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      
      // Verify no database call was made due to validation failure
      expect(mockPrisma.country.create).not.toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/v1/countries')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      
      // Verify no database call was made due to validation failure
      expect(mockPrisma.country.create).not.toHaveBeenCalled();
    });

    it('should return 400 for duplicate country code', async () => {
      // Mock database error for unique constraint violation
      const duplicateError = new Error('Unique constraint failed');
      duplicateError.name = 'PrismaClientKnownRequestError';
      (duplicateError as any).code = 'P2002';
      
      mockPrisma.country.create.mockRejectedValue(duplicateError);

      const response = await request(app)
        .post('/api/v1/countries')
        .send(validCountryData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 for duplicate country name', async () => {
      // Mock database error for unique constraint violation
      const duplicateError = new Error('Unique constraint failed');
      duplicateError.name = 'PrismaClientKnownRequestError';
      (duplicateError as any).code = 'P2002';
      
      mockPrisma.country.create.mockRejectedValue(duplicateError);

      const response = await request(app)
        .post('/api/v1/countries')
        .send({
          name: validCountryData.name,
          code: 'XX'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should normalize country code to uppercase', async () => {
      const expectedResponse = {
        id: 1,
        name: 'Test Country',
        code: 'TEST',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };
      
      mockPrisma.country.create.mockResolvedValue(expectedResponse);

      const response = await request(app)
        .post('/api/v1/countries')
        .send({
          name: 'Test Country',
          code: 'test'
        })
        .expect(200);

      expect(response.body.result.code).toBe('TEST');
      
      // Verify the create method was called with uppercase code
      expect(mockPrisma.country.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'TEST'
        })
      });
    });
  });

  describe('GET /api/v1/countries', () => {
    it('should get all countries', async () => {
      // Mock database response
      mockPrisma.country.findMany.mockResolvedValue([mockCountryResponse, mockCountryResponse2]);
      mockPrisma.country.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/v1/countries')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('Countries retrieved successfully');
      expect(response.body.result.countries).toHaveLength(2);
      expect(response.body.result.count).toBe(2);
      
      expect(mockPrisma.country.findMany).toHaveBeenCalled();
      expect(mockPrisma.country.count).toHaveBeenCalled();
    });

    it('should filter countries by name', async () => {
      mockPrisma.country.findMany.mockResolvedValue([mockCountryResponse]);
      mockPrisma.country.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/countries')
        .query({ name: 'United' })
        .expect(200);

      expect(response.body.result.countries).toHaveLength(1);
      expect(response.body.result.countries[0].name).toContain('United');
      
      // Verify filter was applied
      expect(mockPrisma.country.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.any(Object)
          })
        })
      );
    });

    it('should filter countries by code', async () => {
      mockPrisma.country.findMany.mockResolvedValue([mockCountryResponse]);
      mockPrisma.country.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/countries')
        .query({ code: 'US' })
        .expect(200);

      expect(response.body.result.countries).toHaveLength(1);
      expect(response.body.result.countries[0].code).toBe('US');
      
      // Verify filter was applied
      expect(mockPrisma.country.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            code: expect.any(Object)
          })
        })
      );
    });

    it('should search countries', async () => {
      mockPrisma.country.findMany.mockResolvedValue([mockCountryResponse2]);
      mockPrisma.country.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/countries')
        .query({ search: 'Canada' })
        .expect(200);

      expect(response.body.result.countries).toHaveLength(1);
      expect(response.body.result.countries[0].name).toBe('Canada');
    });
  });

  describe('GET /api/v1/countries/:id', () => {
    it('should get country by valid ID', async () => {
      mockPrisma.country.findUnique.mockResolvedValue(mockCountryResponse);

      const response = await request(app)
        .get(`/api/v1/countries/1`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('Country retrieved successfully');
      expect(response.body.result.id).toBe(mockCountryResponse.id);
      expect(response.body.result.name).toBe(validCountryData.name);
      expect(response.body.result.code).toBe(validCountryData.code);
      
      expect(mockPrisma.country.findUnique).toHaveBeenCalledWith({
        where: { id: 1 }
      });
    });

    it('should return 404 for non-existent ID', async () => {
      mockPrisma.country.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/countries/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .get('/api/v1/countries/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      
      // Verify no database call was made due to validation failure
      expect(mockPrisma.country.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/countries/code/:code', () => {
    it('should get country by valid code', async () => {
      mockPrisma.country.findFirst.mockResolvedValue(mockCountryResponse);

      const response = await request(app)
        .get(`/api/v1/countries/code/${validCountryData.code}`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('Country retrieved successfully');
      expect(response.body.result.code).toBe(validCountryData.code);
      expect(response.body.result.name).toBe(validCountryData.name);
      
      expect(mockPrisma.country.findFirst).toHaveBeenCalledWith({
        where: { code: { equals: validCountryData.code, mode: 'insensitive' } }
      });
    });

    it('should return 404 for non-existent code', async () => {
      mockPrisma.country.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/countries/code/XX')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should be case insensitive', async () => {
      mockPrisma.country.findFirst.mockResolvedValue(mockCountryResponse);

      const response = await request(app)
        .get(`/api/v1/countries/code/${validCountryData.code.toLowerCase()}`)
        .expect(200);

      expect(response.body.result.code).toBe(validCountryData.code);
      
      // Verify case insensitive search was used
      expect(mockPrisma.country.findFirst).toHaveBeenCalledWith({
        where: { code: { equals: validCountryData.code.toLowerCase(), mode: 'insensitive' } }
      });
    });
  });

  describe('PUT /api/v1/countries/:id', () => {
    it('should update country with valid data', async () => {
      const updateData = {
        name: 'United States of America',
        code: 'USA'
      };
      
      const updatedResponse = {
        ...mockCountryResponse,
        ...updateData,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };
      
      mockPrisma.country.update.mockResolvedValue(updatedResponse);

      const response = await request(app)
        .put(`/api/v1/countries/1`)
        .send(updateData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('Country updated successfully');
      expect(response.body.result.name).toBe(updateData.name);
      expect(response.body.result.code).toBe(updateData.code);
      expect(response.body.result.id).toBe(1);
      
      expect(mockPrisma.country.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining(updateData)
      });
    });

    it('should update only name', async () => {
      const updateData = {
        name: 'United States of America'
      };
      
      const updatedResponse = {
        ...mockCountryResponse,
        name: updateData.name,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };
      
      mockPrisma.country.update.mockResolvedValue(updatedResponse);

      const response = await request(app)
        .put(`/api/v1/countries/1`)
        .send(updateData)
        .expect(200);

      expect(response.body.result.name).toBe(updateData.name);
      expect(response.body.result.code).toBe(validCountryData.code); // Should remain unchanged
    });

    it('should update only code', async () => {
      const updateData = {
        code: 'USA'
      };
      
      const updatedResponse = {
        ...mockCountryResponse,
        code: updateData.code,
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };
      
      mockPrisma.country.update.mockResolvedValue(updatedResponse);

      const response = await request(app)
        .put(`/api/v1/countries/1`)
        .send(updateData)
        .expect(200);

      expect(response.body.result.code).toBe(updateData.code);
      expect(response.body.result.name).toBe(validCountryData.name); // Should remain unchanged
    });

    it('should return 404 for non-existent ID', async () => {
      const notFoundError = new Error('Record not found');
      notFoundError.name = 'PrismaClientKnownRequestError';
      (notFoundError as any).code = 'P2025';
      
      mockPrisma.country.update.mockRejectedValue(notFoundError);

      const response = await request(app)
        .put('/api/v1/countries/99999')
        .send({ name: 'Test' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid update data', async () => {
      const response = await request(app)
        .put(`/api/v1/countries/1`)
        .send({ name: '', code: 'TOOLONG' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      
      // Verify no database call was made due to validation failure
      expect(mockPrisma.country.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/v1/countries/:id', () => {
    it('should delete country by valid ID', async () => {
      mockPrisma.country.delete.mockResolvedValue(mockCountryResponse);

      const response = await request(app)
        .delete(`/api/v1/countries/1`)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('Country deleted successfully');
      expect(response.body.result.id).toBe(1);
      
      expect(mockPrisma.country.delete).toHaveBeenCalledWith({
        where: { id: 1 }
      });
    });

    it('should return 404 for non-existent ID', async () => {
      const notFoundError = new Error('Record not found');
      notFoundError.name = 'PrismaClientKnownRequestError';
      (notFoundError as any).code = 'P2025';
      
      mockPrisma.country.delete.mockRejectedValue(notFoundError);

      const response = await request(app)
        .delete('/api/v1/countries/99999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid ID format', async () => {
      const response = await request(app)
        .delete('/api/v1/countries/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      
      // Verify no database call was made due to validation failure
      expect(mockPrisma.country.delete).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/countries/count', () => {
    it('should get total countries count', async () => {
      mockPrisma.country.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/v1/countries/count')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('Countries count retrieved successfully');
      expect(response.body.result.count).toBe(2);
      
      expect(mockPrisma.country.count).toHaveBeenCalled();
    });

    it('should get filtered count', async () => {
      mockPrisma.country.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/countries/count')
        .query({ name: 'United' })
        .expect(200);

      expect(response.body.result.count).toBe(1);
      
      // Verify filter was applied to count
      expect(mockPrisma.country.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            name: expect.any(Object)
          })
        })
      );
    });
  });

  describe('GET /api/v1/countries/search/:searchTerm', () => {
    it('should search countries by term', async () => {
      mockPrisma.country.findMany.mockResolvedValue([mockCountryResponse]);
      mockPrisma.country.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/countries/search/United')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('Countries search completed successfully');
      expect(response.body.result.countries).toHaveLength(1);
      expect(response.body.result.count).toBe(1);
      expect(response.body.result.countries[0].name).toContain('United');
      
      // Verify search was performed
      expect(mockPrisma.country.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array)
          })
        })
      );
    });

    it('should return empty results for non-matching search', async () => {
      mockPrisma.country.findMany.mockResolvedValue([]);
      mockPrisma.country.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/v1/countries/search/NonExistent')
        .expect(200);

      expect(response.body.result.countries).toHaveLength(0);
      expect(response.body.result.count).toBe(0);
    });

    it('should return 400 for empty search term', async () => {
      const response = await request(app)
        .get('/api/v1/countries/search/%20') // URL encoded space
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      
      // Verify no database call was made due to validation failure
      expect(mockPrisma.country.findMany).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Validation', () => {
    it('should handle special characters in country names', async () => {
      const specialCountry = {
        name: "Côte d'Ivoire",
        code: 'CI'
      };
      
      const specialCountryResponse = {
        id: 1,
        name: "Côte d'Ivoire",
        code: 'CI',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };
      
      mockPrisma.country.create.mockResolvedValue(specialCountryResponse);

      const response = await request(app)
        .post('/api/v1/countries')
        .send(specialCountry)
        .expect(200);

      expect(response.body.result.name).toBe(specialCountry.name);
    });

    it('should trim whitespace from inputs', async () => {
      const trimmedResponse = {
        id: 1,
        name: 'Test Country',
        code: 'TC',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
      };
      
      mockPrisma.country.create.mockResolvedValue(trimmedResponse);

      const response = await request(app)
        .post('/api/v1/countries')
        .send({
          name: '  Test Country  ',
          code: '  TC  '
        })
        .expect(200);

      expect(response.body.result.name).toBe('Test Country');
      expect(response.body.result.code).toBe('TC');
      
      // Verify trimmed data was sent to database
      expect(mockPrisma.country.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Country',
          code: 'TC'
        })
      });
    });

    it('should reject country names that are too long', async () => {
      const longNameData = {
        name: 'A'.repeat(101), // Over 100 characters
        code: 'LN'
      };

      const response = await request(app)
        .post('/api/v1/countries')
        .send(longNameData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      
      // Verify no database call was made due to validation failure
      expect(mockPrisma.country.create).not.toHaveBeenCalled();
    });

    it('should reject country codes with numbers', async () => {
      const invalidCodeData = {
        name: 'Test Country',
        code: 'T1'
      };

      const response = await request(app)
        .post('/api/v1/countries')
        .send(invalidCodeData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      
      // Verify no database call was made due to validation failure
      expect(mockPrisma.country.create).not.toHaveBeenCalled();
    });
  });
});
