import express from "express";
import { createUser, login, me, findAllUsers, findUserById, editUser, changePassword } from "../controllers/userController.js";
import { authenticateUser, isAdmin } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { createUserSchema, loginSchema, editUserSchema, changePasswordSchema } from "../schemas/userSchema.js";
import { validId } from "../middlewares/globalMiddleware.js";

const router = express.Router();

router.post("/create", authenticateUser, isAdmin, validate(createUserSchema), createUser);
router.post("/login", validate(loginSchema), login);
router.get("/me", authenticateUser, me);
router.get("/", authenticateUser, isAdmin, findAllUsers);
router.get("/:id", authenticateUser, isAdmin, validId, findUserById);
router.patch("/edit/:id", authenticateUser, isAdmin, validId, validate(editUserSchema), editUser);
router.patch("/change-password", authenticateUser, validate(changePasswordSchema), changePassword);

export default router;
