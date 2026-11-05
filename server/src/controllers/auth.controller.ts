import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User, UserStatus } from "../models/User";
import { AuthenticatedRequest } from "../types/types";

const JWT_SECRET = process.env.JWT_SECRET || "nexora_default_secret_key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Helper: Generate JWT token
const signToken = (userId: string, email: string): string => {
  return jwt.sign({ id: userId, email }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN as any,
  });
};


export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name?.trim() || !email?.trim() || !password) {
      res
        .status(400)
        .json({
          success: false,
          message: "Name, email, and password are required",
        });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res
        .status(409)
        .json({
          success: false,
          message: "User already exists with this email",
        });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      status: UserStatus.ACTIVE,
    });

    const token = signToken(newUser._id.toString(), newUser.email);

    res.status(201).json({
      success: true,
      message: "Account created successfully",
      data: {
        token,
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          status: newUser.status,
          createdAt: newUser.createdAt,
        },
      },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Registration failed",
        error: error.message,
      });
  }
};


export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    if (user.status !== UserStatus.ACTIVE) {
      res
        .status(403)
        .json({ success: false, message: "Account is suspended or inactive" });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    const token = signToken(user._id.toString(), user.email);

    res.status(200).json({
      success: true,
      message: "Logged in successfully",
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: user.status,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error: any) {
    res
      .status(500)
      .json({ success: false, message: "Login failed", error: error.message });
  }
};

export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthenticated" });
      return;
    }

    const user = await User.findById(userId).select("-passwordHash -__v");
    if (!user) {
      res.status(404).json({ success: false, message: "User not found" });
      return;
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error: any) {
    res
      .status(500)
      .json({
        success: false,
        message: "Failed to fetch user profile",
        error: error.message,
      });
  }
};


export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: "Logged out successfully",
  });
};
