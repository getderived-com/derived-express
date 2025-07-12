import { Request, Response } from "express";
import { UserService } from "./user.service";
import { success } from "../../../shared/api-response/response-handler";
import { asyncHandler } from "../../../shared/utils/async-handler.util";

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // POST /users/register
  register = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.userService.register(req.body);

    success(res, result, "User registered successfully");
  });

  // POST /users/login
  login = asyncHandler(async (req: Request, res: Response) => {
    const result = await this.userService.login(req.body);

    success(res, result, "User logged in successfully");
  });

  // GET /users
  getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const { name, email, search } = req.query;

    let users;
    
    if (search) {
      users = await this.userService.searchUsers(search as string);
    } else {
      const filters = {
        name: name as string | undefined,
        email: email as string | undefined
      };
      users = await this.userService.getAllUsers(filters);
    }

    const count = users.length;

    success(res, { rows: users, count }, "Users retrieved successfully");
  });

  // GET /users/:id
  getUserById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await this.userService.getUserById(Number(id));

    success(res, user, "User retrieved successfully");
  });

  // GET /users/email/:email
  getUserByEmail = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.params;

    const user = await this.userService.getUserByEmail(email);

    success(res, user, "User retrieved successfully");
  });

  // POST /users
  createUser = asyncHandler(async (req: Request, res: Response) => {
    const user = await this.userService.createUser(req.body);

    success(res, user, "User created successfully");
  });

  // PUT /users/:id
  updateUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await this.userService.updateUser(Number(id), req.body);

    success(res, user, "User updated successfully");
  });

  // DELETE /users/:id
  deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const user = await this.userService.deleteUser(Number(id));

    success(res, user, "User deleted successfully");
  });

  // GET /users/count
  getUsersCount = asyncHandler(async (req: Request, res: Response) => {
    const { name, email } = req.query;

    const filters = {
      name: name as string | undefined,
      email: email as string | undefined
    };

    const count = await this.userService.getUsersCount(filters);

    success(res, { count }, "Users count retrieved successfully");
  });

  // GET /users/search/:searchTerm
  searchUsers = asyncHandler(async (req: Request, res: Response) => {
    const { searchTerm } = req.params;

    const users = await this.userService.searchUsers(searchTerm);

    success(res, { users, count: users.length }, "Users search completed successfully");
  });
}
