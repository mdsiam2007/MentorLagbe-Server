import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getCollections } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { UserRole } from '../models/types';

export const adminGetAllUsers = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { users } = getCollections();
    const items = await users
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error: any) {
    console.error('[UserController.adminGetAllUsers] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve users.',
      error: error.message
    });
  }
};

export const adminUpdateUserRole = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { role } = req.body;

    const validRoles: UserRole[] = ['student', 'tutor', 'admin'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid role.' });
      return;
    }

    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid User ID.' });
      return;
    }

    const { users } = getCollections();
    const result = await users.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { role, updatedAt: new Date() } },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (!result) {
      res.status(404).json({ success: false, message: 'User not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `User role updated to ${role} successfully.`,
      data: result
    });
  } catch (error: any) {
    console.error('[UserController.adminUpdateUserRole] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role.',
      error: error.message
    });
  }
};

export const getDashboardStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { users, tuitions, applications, payments } = getCollections();
    const role = req.user.role;

    if (role === 'student') {
      const [totalApplied, accepted, pending] = await Promise.all([
        applications.countDocuments({ studentEmail: req.user.email }),
        applications.countDocuments({ studentEmail: req.user.email, status: 'accepted' }),
        applications.countDocuments({ studentEmail: req.user.email, status: 'pending' })
      ]);

      const user = await users.findOne({ email: req.user.email });

      res.status(200).json({
        success: true,
        data: {
          totalApplied,
          accepted,
          pending,
          plan: user?.plan || 'free'
        }
      });
      return;
    }

    if (role === 'tutor') {
      const [totalPosted, activeApproved, applicants] = await Promise.all([
        tuitions.countDocuments({ tutorEmail: req.user.email }),
        tuitions.countDocuments({ tutorEmail: req.user.email, approvalStatus: 'approved', isActive: true }),
        applications.countDocuments({ tutorEmail: req.user.email })
      ]);

      const user = await users.findOne({ email: req.user.email });

      res.status(200).json({
        success: true,
        data: {
          totalPosted,
          activeApproved,
          applicantsReceived: applicants,
          plan: user?.plan || 'free'
        }
      });
      return;
    }

    if (role === 'admin') {
      const [totalUsers, totalTutors, totalStudents, pendingTuitions, approvedTuitions, paymentRecords] = await Promise.all([
        users.countDocuments({}),
        users.countDocuments({ role: 'tutor' }),
        users.countDocuments({ role: 'student' }),
        tuitions.countDocuments({ approvalStatus: 'pending' }),
        tuitions.countDocuments({ approvalStatus: 'approved' }),
        payments.find({}).toArray()
      ]);

      const totalRevenue = paymentRecords.reduce((sum, item) => sum + (item.amount || 0), 0);

      res.status(200).json({
        success: true,
        data: {
          totalUsers,
          totalTutors,
          totalStudents,
          pendingTuitions,
          approvedTuitions,
          totalRevenue
        }
      });
      return;
    }

    res.status(400).json({ success: false, message: 'Unknown role.' });
  } catch (error: any) {
    console.error('[UserController.getDashboardStats] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats.',
      error: error.message
    });
  }
};

export const getPublicTutors = async (req: Request, res: Response): Promise<void> => {
  try {
    const { users, tuitions } = getCollections();
    const { search, subject } = req.query;

    const filter: any = { role: 'tutor' };

    if (search && typeof search === 'string') {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { bio: { $regex: search, $options: 'i' } }
      ];
    }

    const tutorList = await users
      .find(filter, { projection: { password: 0 } })
      .sort({ plan: -1, createdAt: -1 })
      .toArray();

    // Attach active tuition count & subjects to each tutor
    const enrichedTutors = await Promise.all(
      tutorList.map(async (tutor) => {
        const tutorTuitions = await tuitions
          .find({ tutorEmail: tutor.email, approvalStatus: 'approved', isActive: true })
          .project({ subject: 1, monthlyFee: 1, mode: 1 })
          .toArray();

        const subjects = Array.from(new Set(tutorTuitions.map((t) => t.subject)));
        return {
          ...tutor,
          tuitionCount: tutorTuitions.length,
          subjects,
          minFee: tutorTuitions.length > 0 ? Math.min(...tutorTuitions.map((t) => t.monthlyFee || 0)) : 0
        };
      })
    );

    // If subject query is provided, filter enriched tutors
    const filtered = subject && typeof subject === 'string'
      ? enrichedTutors.filter((t) => t.subjects.some((s) => s.toLowerCase().includes(subject.toLowerCase())))
      : enrichedTutors;

    res.status(200).json({
      success: true,
      data: filtered
    });
  } catch (error: any) {
    console.error('[UserController.getPublicTutors] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tutors.',
      error: error.message
    });
  }
};

export const getPublicTutorById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid Tutor ID.' });
      return;
    }

    const { users, tuitions } = getCollections();
    const tutor = await users.findOne(
      { _id: new ObjectId(id), role: 'tutor' },
      { projection: { password: 0 } }
    );

    if (!tutor) {
      res.status(404).json({ success: false, message: 'Tutor not found.' });
      return;
    }

    const activeTuitions = await tuitions
      .find({ tutorEmail: tutor.email, approvalStatus: 'approved', isActive: true })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: {
        ...tutor,
        tuitions: activeTuitions
      }
    });
  } catch (error: any) {
    console.error('[UserController.getPublicTutorById] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tutor profile.',
      error: error.message
    });
  }
};
