import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env';
import { UserRole, UserPlan } from '../models/types';

export interface AuthUserPayload {
  userId: string;
  email: string;
  role: UserRole;
  plan: UserPlan;
  name: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

export const verifyToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Access denied. No token provided or invalid format.'
    });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

export const verifyStudent = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'student') {
    res.status(403).json({
      success: false,
      message: 'Forbidden. Access restricted to students only.'
    });
    return;
  }
  next();
};

export const verifyTutor = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'tutor') {
    res.status(403).json({
      success: false,
      message: 'Forbidden. Access restricted to tutors only.'
    });
    return;
  }
  next();
};

export const verifyAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      message: 'Forbidden. Access restricted to administrators only.'
    });
    return;
  }
  next();
};
