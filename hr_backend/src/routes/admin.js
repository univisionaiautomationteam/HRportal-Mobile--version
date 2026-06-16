import express from "express";
import {
  adminLogin,
  addUser,
  getUsers,
  updateUser,
  deleteUser
} from "../controllers/adminController.js";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/add-user", addUser);
router.get("/users", getUsers);
router.put("/update-user/:id", updateUser);
router.delete("/delete-user/:id", deleteUser);

export default router;
