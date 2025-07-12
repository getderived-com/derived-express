import { Router } from "express";
import { validate } from "../../../shared/middlewares/validation.middleware";
import { UserController } from "./user.controller";
import {
    userFiltersSchema,
    searchTermParamSchema,
    userEmailParamSchema,
    createUserSchema,
    updateUserSchema,
    registerUserSchema,
    loginUserSchema
} from "./user.validation";
import { idParamSchema } from "../../../shared/utils/_zod-utils/id-params";

const userRouter: Router = Router();
const userController = new UserController();

// POST /users/register - Register new user
userRouter.post("/register", validate({
  body: registerUserSchema
}), userController.register);

// POST /users/login - Login user
userRouter.post("/login", validate({
  body: loginUserSchema
}), userController.login);

// GET /users - Get all users with optional filtering and search
userRouter.get("/", validate({
  query: userFiltersSchema
}), userController.getAllUsers);

// GET /users/count - Get users count with optional filtering
userRouter.get("/count", validate({
  query: userFiltersSchema
}), userController.getUsersCount);

// GET /users/search/:searchTerm - Search users by term
userRouter.get("/search/:searchTerm", validate({
  params: searchTermParamSchema
}), 
userController.searchUsers);

// GET /users/email/:email - Get user by email
userRouter.get("/email/:email", validate({
  params: userEmailParamSchema
}), userController.getUserByEmail);

// GET /users/:id - Get user by ID
userRouter.get("/:id", validate({
  params: idParamSchema
}), userController.getUserById);

// POST /users - Create new user (admin endpoint)
userRouter.post("/", validate({
  body: createUserSchema
}), userController.createUser);

// PUT /users/:id - Update user
userRouter.put("/:id", validate({
  params: idParamSchema,
  body: updateUserSchema
}), userController.updateUser);

// DELETE /users/:id - Delete user
userRouter.delete("/:id", validate({
  params: idParamSchema
}), userController.deleteUser);

export default userRouter;
