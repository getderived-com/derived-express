import { UserRepository, type UserResponse, type CreateUserData, type UpdateUserData, type UserFilters } from "./user.repo";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../../../shared/utils/http-errors.util";
import { hashPassword, checkPassword } from "../../../shared/utils/password-hash";
import { generateToken } from "../../../shared/jwt/token-utils";

export interface LoginResponse {
  user: UserResponse;
  token: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class UserService {
  private userRepo: UserRepository;

  constructor() {
    this.userRepo = new UserRepository();
  }

  async register(data: RegisterData): Promise<LoginResponse> {
    // Check if user already exists
    const existingUser = await this.userRepo.existsByEmail(data.email);
    if (existingUser) {
      throw new BadRequestError(`User with email '${data.email}' already exists`);
    }

    try {
      // Hash password
      const hashedPassword = hashPassword(data.password);

      // Create user
      const user = await this.userRepo.create({
        ...data,
        password: hashedPassword
      });

      // Generate JWT token
      const token = generateToken({ userId: user.id, email: user.email });

      return { user, token };
    } catch (error) {
      throw new BadRequestError("Failed to register user", error);
    }
  }

  async login(data: LoginData): Promise<LoginResponse> {
    try {
      // Find user with password
      const userWithPassword = await this.userRepo.findByEmailWithPassword(data.email);
      if (!userWithPassword) {
        throw new UnauthorizedError("Invalid email or password");
      }

      // Check password
      const isPasswordValid = checkPassword(data.password, userWithPassword.password);
      if (!isPasswordValid) {
        throw new UnauthorizedError("Invalid email or password");
      }

      // Get user without password for response
      const user = await this.userRepo.findByEmail(data.email);
      if (!user) {
        throw new NotFoundError("User not found");
      }

      // Generate JWT token
      const token = generateToken({ userId: user.id, email: user.email });

      return { user, token };
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof NotFoundError) {
        throw error;
      }
      throw new BadRequestError("Failed to login", error);
    }
  }

  async createUser(data: CreateUserData): Promise<UserResponse> {
    // Check if user already exists
    const existingUser = await this.userRepo.existsByEmail(data.email);
    if (existingUser) {
      throw new BadRequestError(`User with email '${data.email}' already exists`);
    }

    try {
      // Hash password
      const hashedPassword = hashPassword(data.password);

      return await this.userRepo.create({
        ...data,
        password: hashedPassword
      });
    } catch (error) {
      throw new BadRequestError("Failed to create user", error);
    }
  }

  async getUserById(id: number): Promise<UserResponse> {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    return user;
  }

  async getUserByEmail(email: string): Promise<UserResponse> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new NotFoundError(`User with email '${email}' not found`);
    }

    return user;
  }

  async getAllUsers(filters?: UserFilters): Promise<UserResponse[]> {
    try {
      return await this.userRepo.findAll(filters);
    } catch (error) {
      throw new BadRequestError("Failed to fetch users", error);
    }
  }

  async updateUser(id: number, data: UpdateUserData): Promise<UserResponse> {
    // Check if user exists
    const existingUser = await this.userRepo.findById(id);
    if (!existingUser) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    // Check for email duplicate only if email is being changed
    if (data.email && data.email !== existingUser.email) {
      const existingByEmail = await this.userRepo.existsByEmail(data.email);
      if (existingByEmail) {
        throw new BadRequestError(`User with email '${data.email}' already exists`);
      }
    }

    try {
      const updateData = { ...data };
      
      // Hash password if it's being updated
      if (data.password) {
        updateData.password = hashPassword(data.password);
      }

      return await this.userRepo.update(id, updateData);
    } catch (error) {
      throw new BadRequestError("Failed to update user", error);
    }
  }

  async deleteUser(id: number): Promise<UserResponse> {
    // Check if user exists
    const existingUser = await this.userRepo.findById(id);
    if (!existingUser) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    try {
      return await this.userRepo.delete(id);
    } catch (error) {
      throw new BadRequestError("Failed to delete user", error);
    }
  }

  async getUsersCount(filters?: UserFilters): Promise<number> {
    try {
      return await this.userRepo.count(filters);
    } catch (error) {
      throw new BadRequestError("Failed to count users", error);
    }
  }

  async searchUsers(searchTerm: string): Promise<UserResponse[]> {
    const filters: UserFilters = {
      name: searchTerm.trim()
    };

    return await this.getAllUsers(filters);
  }
}
