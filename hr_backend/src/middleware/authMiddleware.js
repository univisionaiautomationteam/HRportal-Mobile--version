import jwt from "jsonwebtoken";
import pool from "../config/database.js";

export const protect = async (req, res, next) => {
  // 🚀 TEMPORARY BYPASS: Inject a mock user so the frontend works without login
  req.user = { id: 1, name: "Test Admin", email: "admin@hrportal.com", role: "admin" };
  next();
};

// import jwt from 'jsonwebtoken';

// export const authMiddleware = (req, res, next) => {
//   const authHeader = req.headers.authorization;

//   if (!authHeader) {
//     return res.status(401).json({ message: 'Missing token' });
//   }

//   const token = authHeader.split(' ')[1];

//   try {
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     req.user = decoded; // 🔥 THIS IS IMPORTANT
//     next();
//   } catch (err) {
//     return res.status(401).json({ message: 'Invalid token' });
//   }
// };
