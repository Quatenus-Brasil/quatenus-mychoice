import express from "express";
import { createCombo, findAllCombos, findComboById, deleteCombo, editCombo } from "../controllers/comboController.js";
import { authenticateUser, isAdmin, isManager, authorizedSectors } from "../middlewares/authMiddleware.js";
import { validId } from "../middlewares/globalMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { createComboSchema, editComboSchema } from "../schemas/comboSchema.js";

const router = express.Router();

router.post("/", authenticateUser, isManager, authorizedSectors("Suporte & Operações"), validate(createComboSchema), createCombo);
router.get("/", authenticateUser, findAllCombos);
router.get("/:id", authenticateUser, validId, findComboById);
router.delete("/:id", authenticateUser, validId, isManager, authorizedSectors("Suporte & Operações"), deleteCombo);
router.patch("/:id", authenticateUser, validId, isManager, authorizedSectors("Suporte & Operações"), validate(editComboSchema), editCombo);

export default router;
