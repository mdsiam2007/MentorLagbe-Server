import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ObjectId } from 'mongodb';
import { getCollections } from '../config/db';
import { ENV } from '../config/env';
import { IUser, UserRole } from '../models/types';
import { AuthenticatedRequest } from '../middleware/auth';

const generateToken = (user: IUser): string => {
  return jwt.sign(
    {
      userId: user._id?.toString(),
      email: user.email,
      role: user.role,
      plan: user.plan,
      name: user.name
    },
    ENV.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, role, phone, bio, image } = req.body;

    if (!name || !email || !password || !role) {
      res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required.'
      });
      return;
    }

    if (typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Name must be at least 2 characters long.'
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
      return;
    }

    if (typeof password !== 'string' || password.length < 6) {
      res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
      return;
    }
    // Security Fix: Prevent public self-registration as admin
    const validRoles: UserRole[] = ['student', 'tutor'];
    if (!validRoles.includes(role)) {
      res.status(400).json({
        success: false,
        message: 'Invalid role. Public registration is restricted to student and tutor roles.'
      });
      return;
    }

    const { users } = getCollections();
    const existingUser = await users.findOne({ email: normalizedEmail });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'An account with this email already exists.'
      });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser: IUser = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: role as UserRole,
      plan: 'free',
      phone: phone || '',
      bio: bio || '',
      image: image || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      bookmarks: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await users.insertOne(newUser as any);
    newUser._id = result.insertedId;

    const token = generateToken(newUser);

    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error: any) {
    console.error('[AuthController.register] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration.',
      error: error.message
    });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const { users } = getCollections();
    const user = (await users.findOne({ email: normalizedEmail })) as IUser | null;

    if (!user || !user.password) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
      return;
    }

    const token = generateToken(user);
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: userWithoutPassword,
        token
      }
    });
  } catch (error: any) {
    console.error('[AuthController.login] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during login.',
      error: error.message
    });
  }
};

export const getMe = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { users } = getCollections();
    const user = (await users.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0 } }
    )) as IUser | null;

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error: any) {
    console.error('[AuthController.getMe] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile.',
      error: error.message
    });
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.userId) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { name, phone, bio, image } = req.body;
    const { users } = getCollections();

    const updateFields: Partial<IUser> = {
      updatedAt: new Date()
    };
    if (name) updateFields.name = name.trim();
    if (phone !== undefined) updateFields.phone = phone.trim();
    if (bio !== undefined) updateFields.bio = bio.trim();
    if (image) updateFields.image = image.trim();

    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(req.user.userId) },
      { $set: updateFields },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: result
    });
  } catch (error: any) {
    console.error('[AuthController.updateProfile] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile.',
      error: error.message
    });
  }
};
