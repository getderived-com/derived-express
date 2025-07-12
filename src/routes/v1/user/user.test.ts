import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../../../express-app';
import { prisma } from '../../../shared/db-prisma/prismaClient';
import * as passwordHash from '../../../shared/password-hash';
import * as tokenUtils from '../../../shared/jwt/token-utils';

// Mock the Prisma client
vi.mock('../../../shared/db-prisma/prismaClient', () => ({
  prisma: {
    user: {
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

// Mock password hashing functions
vi.mock('../../../shared/password-hash', () => ({
  hashPassword: vi.fn(),
  checkPassword: vi.fn(),
}));

// Mock JWT token functions
vi.mock('../../../shared/jwt/token-utils', () => ({
  generateToken: vi.fn(),
  verifyToken: vi.fn(),
}));

const mockPrisma = prisma as any;
const mockHashPassword = passwordHash.hashPassword as any;
const mockCheckPassword = passwordHash.checkPassword as any;
const mockGenerateToken = tokenUtils.generateToken as any;

describe('User API', () => {
  // Test data
  const validUserData = {
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'Password123'
  };

  const validUserData2 = {
    name: 'Jane Smith',
    email: 'jane.smith@example.com', 
    password: 'Password456'
  };

  const validLoginData = {
    email: 'john.doe@example.com',
    password: 'Password123'
  };

  const mockUserResponse = {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockUserResponse2 = {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockUserWithPassword = {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    password: 'hashedPassword123',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  };

  const mockJwtToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockHashPassword.mockReturnValue('hashedPassword123');
    mockCheckPassword.mockReturnValue(true);
    mockGenerateToken.mockReturnValue(mockJwtToken);
  });

  describe('POST /api/v1/users/register', () => {
    it('should register a new user successfully', async () => {
      // Mock email check (user doesn't exist)
      mockPrisma.user.count.mockResolvedValueOnce(0);
      // Mock user creation
      mockPrisma.user.create.mockResolvedValue(mockUserWithPassword);

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('User registered successfully');
      expect(response.body.result.user).toMatchObject({
        id: 1,
        name: validUserData.name,
        email: validUserData.email
      });
      expect(response.body.result.user.password).toBeUndefined();
      expect(response.body.result.token).toBe(mockJwtToken);

      // Verify password was hashed
      expect(mockHashPassword).toHaveBeenCalledWith(validUserData.password);
      // Verify token was generated
      expect(mockGenerateToken).toHaveBeenCalledWith({
        userId: 1,
        email: validUserData.email
      });
    });

    it('should return 400 for duplicate email during registration', async () => {
      // Mock email check (user exists)
      mockPrisma.user.count.mockResolvedValueOnce(1);

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
      
      // Verify no user creation was attempted
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid registration data', async () => {
      const invalidData = {
        name: '', // Invalid: empty name
        email: 'invalid-email', // Invalid: not an email
        password: '123' // Invalid: too short and no uppercase/lowercase
      };

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
      
      // Verify no database operations were attempted
      expect(mockPrisma.user.count).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase during registration', async () => {
      const dataWithUppercaseEmail = {
        ...validUserData,
        email: 'JOHN.DOE@EXAMPLE.COM'
      };

      mockPrisma.user.count.mockResolvedValueOnce(0);
      mockPrisma.user.create.mockResolvedValue({
        ...mockUserWithPassword,
        email: 'john.doe@example.com'
      });

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(dataWithUppercaseEmail)
        .expect(200);

      expect(response.body.result.user.email).toBe('john.doe@example.com');
    });
  });

  describe('POST /api/v1/users/login', () => {
    it('should login user successfully with valid credentials', async () => {
      // Mock finding user with password
      mockPrisma.user.findUnique
        .mockResolvedValueOnce(mockUserWithPassword) // findByEmailWithPassword
        .mockResolvedValueOnce(mockUserResponse); // findByEmail

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(validLoginData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('User logged in successfully');
      expect(response.body.result.user).toMatchObject({
        id: 1,
        name: 'John Doe',
        email: validLoginData.email
      });
      expect(response.body.result.user.password).toBeUndefined();
      expect(response.body.result.token).toBe(mockJwtToken);

      // Verify password was checked
      expect(mockCheckPassword).toHaveBeenCalledWith(
        validLoginData.password,
        mockUserWithPassword.password
      );
    });

    it('should return 401 for non-existent user', async () => {
      // Mock user not found
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for invalid password', async () => {
      // Mock finding user but password check fails
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUserWithPassword);
      mockCheckPassword.mockReturnValue(false);

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(validLoginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 400 for invalid login data', async () => {
      const invalidLoginData = {
        email: 'invalid-email',
        password: '' // Empty password
      };

      const response = await request(app)
        .post('/api/v1/users/login')
        .send(invalidLoginData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('POST /api/v1/users', () => {
    it('should create a new user successfully', async () => {
      // Mock email check (user doesn't exist)
      mockPrisma.user.count.mockResolvedValueOnce(0);
      // Mock user creation
      mockPrisma.user.create.mockResolvedValue(mockUserWithPassword);

      const response = await request(app)
        .post('/api/v1/users')
        .send(validUserData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('User created successfully');
      expect(response.body.result).toMatchObject({
        id: 1,
        name: validUserData.name,
        email: validUserData.email
      });
      expect(response.body.result.password).toBeUndefined();

      // Verify password was hashed
      expect(mockHashPassword).toHaveBeenCalledWith(validUserData.password);
    });

    it('should return 400 for duplicate email during creation', async () => {
      // Mock email check (user exists)
      mockPrisma.user.count.mockResolvedValueOnce(1);

      const response = await request(app)
        .post('/api/v1/users')
        .send(validUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('GET /api/v1/users', () => {
    it('should get all users without filters', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        mockUserWithPassword,
        { ...mockUserWithPassword, id: 2, name: 'Jane Smith', email: 'jane.smith@example.com' }
      ]);

      const response = await request(app)
        .get('/api/v1/users')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('Users retrieved successfully');
      expect(response.body.result.rows).toHaveLength(2);
      expect(response.body.result.count).toBe(2);
      
      // Verify passwords are excluded
      response.body.result.rows.forEach((user: any) => {
        expect(user.password).toBeUndefined();
      });
    });

    it('should filter users by name', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUserWithPassword]);

      const response = await request(app)
        .get('/api/v1/users?name=John')
        .expect(200);

      expect(response.body.result.rows).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'John',
            mode: 'insensitive'
          }
        },
        orderBy: { name: 'asc' }
      });
    });

    it('should filter users by email', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUserWithPassword]);

      const response = await request(app)
        .get('/api/v1/users?email=john.doe')
        .expect(200);

      expect(response.body.result.rows).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          email: {
            contains: 'john.doe',
            mode: 'insensitive'
          }
        },
        orderBy: { name: 'asc' }
      });
    });

    it('should search users when search parameter is provided', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUserWithPassword]);

      const response = await request(app)
        .get('/api/v1/users?search=John')
        .expect(200);

      expect(response.body.result.rows).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'John',
            mode: 'insensitive'
          }
        },
        orderBy: { name: 'asc' }
      });
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should get user by ID successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPassword);

      const response = await request(app)
        .get('/api/v1/users/1')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('User retrieved successfully');
      expect(response.body.result).toMatchObject({
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com'
      });
      expect(response.body.result.password).toBeUndefined();
    });

    it('should return 404 for non-existent user ID', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/users/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid user ID', async () => {
      const response = await request(app)
        .get('/api/v1/users/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('GET /api/v1/users/email/:email', () => {
    it('should get user by email successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUserWithPassword);

      const response = await request(app)
        .get('/api/v1/users/email/john.doe@example.com')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('User retrieved successfully');
      expect(response.body.result).toMatchObject({
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com'
      });
      expect(response.body.result.password).toBeUndefined();
    });

    it('should return 404 for non-existent email', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/users/email/nonexistent@example.com')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await request(app)
        .get('/api/v1/users/email/invalid-email')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    const updateData = {
      name: 'John Updated',
      email: 'john.updated@example.com'
    };

    it('should update user successfully', async () => {
      // Mock finding existing user
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUserWithPassword);
      // Mock email check (no duplicate)
      mockPrisma.user.count.mockResolvedValueOnce(0);
      // Mock user update
      mockPrisma.user.update.mockResolvedValue({
        ...mockUserWithPassword,
        ...updateData
      });

      const response = await request(app)
        .put('/api/v1/users/1')
        .send(updateData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('User updated successfully');
      expect(response.body.result.name).toBe(updateData.name);
      expect(response.body.result.email).toBe(updateData.email);
      expect(response.body.result.password).toBeUndefined();
    });

    it('should update user password and hash it', async () => {
      const updateWithPassword = {
        name: 'John Updated',
        password: 'NewPassword123'
      };

      // Mock finding existing user
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUserWithPassword);
      // Mock user update
      mockPrisma.user.update.mockResolvedValue({
        ...mockUserWithPassword,
        name: updateWithPassword.name
      });

      const response = await request(app)
        .put('/api/v1/users/1')
        .send(updateWithPassword)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(mockHashPassword).toHaveBeenCalledWith(updateWithPassword.password);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          name: updateWithPassword.name,
          password: 'hashedPassword123'
        })
      });
    });

    it('should return 404 for non-existent user during update', async () => {
      // Mock user not found
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .put('/api/v1/users/999')
        .send(updateData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should return 400 for duplicate email during update', async () => {
      // Mock finding existing user
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUserWithPassword);
      // Mock email duplicate check (email exists)
      mockPrisma.user.count.mockResolvedValueOnce(1);

      const response = await request(app)
        .put('/api/v1/users/1')
        .send(updateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should return 400 for invalid update data', async () => {
      const invalidUpdateData = {
        name: '', // Invalid: empty name
        email: 'invalid-email' // Invalid: not an email
      };

      const response = await request(app)
        .put('/api/v1/users/1')
        .send(invalidUpdateData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete user successfully', async () => {
      // Mock finding existing user
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUserWithPassword);
      // Mock user deletion
      mockPrisma.user.delete.mockResolvedValue(mockUserWithPassword);

      const response = await request(app)
        .delete('/api/v1/users/1')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('User deleted successfully');
      expect(response.body.result).toMatchObject({
        id: 1,
        name: 'John Doe',
        email: 'john.doe@example.com'
      });
      expect(response.body.result.password).toBeUndefined();
    });

    it('should return 404 for non-existent user during deletion', async () => {
      // Mock user not found
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const response = await request(app)
        .delete('/api/v1/users/999')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });
  });

  describe('GET /api/v1/users/count', () => {
    it('should get users count without filters', async () => {
      mockPrisma.user.count.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/v1/users/count')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('Users count retrieved successfully');
      expect(response.body.result.count).toBe(5);
    });

    it('should get users count with name filter', async () => {
      mockPrisma.user.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/v1/users/count?name=John')
        .expect(200);

      expect(response.body.result.count).toBe(2);
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'John',
            mode: 'insensitive'
          }
        }
      });
    });

    it('should get users count with email filter', async () => {
      mockPrisma.user.count.mockResolvedValue(1);

      const response = await request(app)
        .get('/api/v1/users/count?email=example.com')
        .expect(200);

      expect(response.body.result.count).toBe(1);
      expect(mockPrisma.user.count).toHaveBeenCalledWith({
        where: {
          email: {
            contains: 'example.com',
            mode: 'insensitive'
          }
        }
      });
    });
  });

  describe('GET /api/v1/users/search/:searchTerm', () => {
    it('should search users successfully', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUserWithPassword]);

      const response = await request(app)
        .get('/api/v1/users/search/John')
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      expect(response.body.msg).toBe('Users search completed successfully');
      expect(response.body.result.users).toHaveLength(1);
      expect(response.body.result.count).toBe(1);
      expect(response.body.result.users[0].password).toBeUndefined();

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
        where: {
          name: {
            contains: 'John',
            mode: 'insensitive'
          }
        },
        orderBy: { name: 'asc' }
      });
    });

    it('should return 400 for empty search term', async () => {
      const response = await request(app)
        .get('/api/v1/users/search/ ')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Validation failed');
    });

    it('should return empty results for no matches', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/users/search/NonExistent')
        .expect(200);

      expect(response.body.result.users).toHaveLength(0);
      expect(response.body.result.count).toBe(0);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.user.findMany.mockRejectedValue(dbError);

      const response = await request(app)
        .get('/api/v1/users')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to fetch users');
    });

    it('should handle unexpected errors during registration', async () => {
      mockPrisma.user.count.mockResolvedValueOnce(0);
      const unexpectedError = new Error('Unexpected database error');
      mockPrisma.user.create.mockRejectedValue(unexpectedError);

      const response = await request(app)
        .post('/api/v1/users/register')
        .send(validUserData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to register user');
    });

    it('should handle user with same email but different case during update', async () => {
      const userWithSameEmail = {
        ...mockUserWithPassword,
        email: 'john.doe@example.com' // Same email as update
      };

      // Mock finding existing user
      mockPrisma.user.findUnique.mockResolvedValueOnce(userWithSameEmail);

      const updateData = {
        name: 'John Updated',
        email: 'john.doe@example.com' // Same email, should not trigger duplicate check
      };

      // Mock user update
      mockPrisma.user.update.mockResolvedValue({
        ...userWithSameEmail,
        name: updateData.name
      });

      const response = await request(app)
        .put('/api/v1/users/1')
        .send(updateData)
        .expect(200);

      expect(response.body.statusCode).toBe(200);
      // Should not call count for duplicate check since email is same
      expect(mockPrisma.user.count).not.toHaveBeenCalled();
    });
  });
});
