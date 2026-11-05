import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";


declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

interface DecodedToken extends JwtPayload {
  userId: string;
}

const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      res.status(401).json({ message: "Token Not Found" });
      return;
    }

    const secret = process.env.JWT_SECRET_KEY || "nexora_default_secret_key";
    const decode = jwt.verify(token, secret) as unknown as DecodedToken;

    if (!decode) {
      res.status(400).json({ message: "Token Not Valid" });
      return;
    }

    req.userId = decode.userId;
    next();
  } catch (error: any) {
    console.error("isAuth error:", error.message);
    res.status(500).json({ message: "isAuth Error" });
  }
};

export { authenticate };
