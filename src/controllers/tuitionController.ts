import { Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import { getCollections } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { ITuition, IUser } from '../models/types';

export const getApprovedTuitions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { search, subject, classLevel, mode, page = '1', limit = '9' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit as string, 10) || 9);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {
      approvalStatus: 'approved',
      isActive: true
    };

    if (search && typeof search === 'string' && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { subject: searchRegex },
        { location: searchRegex }
      ];
    }

    if (subject && typeof subject === 'string' && subject !== 'All') {
      filter.subject = new RegExp(`^${subject.trim()}$`, 'i');
    }

    if (classLevel && typeof classLevel === 'string' && classLevel !== 'All') {
      filter.classLevel = classLevel.trim();
    }

    if (mode && typeof mode === 'string' && mode !== 'All') {
      filter.mode = mode.trim();
    }

    const { tuitions, users } = getCollections();

    const [rawItems, total] = await Promise.all([
      tuitions
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      tuitions.countDocuments(filter)
    ]);

    const items = await Promise.all(
      rawItems.map(async (item) => {
        if (item.tutorEmail) {
          const tutorUser = await users.findOne({ email: item.tutorEmail }, { projection: { _id: 1 } });
          return { ...item, tutorId: tutorUser?._id?.toString() };
        }
        return item;
      })
    );

    const totalPages = Math.ceil(total / limitNum) || 1;

    res.status(200).json({
      success: true,
      data: items,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages
      }
    });
  } catch (error: any) {
    console.error('[TuitionController.getApprovedTuitions] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tuitions.',
      error: error.message
    });
  }
};

export const getFeaturedTuitions = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { tuitions, users } = getCollections();
    const rawItems = await tuitions
      .find({ approvalStatus: 'approved', isActive: true })
      .sort({ createdAt: -1 })
      .limit(6)
      .toArray();

    const items = await Promise.all(
      rawItems.map(async (item) => {
        if (item.tutorEmail) {
          const tutorUser = await users.findOne({ email: item.tutorEmail }, { projection: { _id: 1 } });
          return { ...item, tutorId: tutorUser?._id?.toString() };
        }
        return item;
      })
    );

    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error: any) {
    console.error('[TuitionController.getFeaturedTuitions] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch featured tuitions.',
      error: error.message
    });
  }
};

export const getTuitionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid tuition ID format.' });
      return;
    }

    const { tuitions, users } = getCollections();
    const tuition = await tuitions.findOne({ _id: new ObjectId(id) });

    if (!tuition) {
      res.status(404).json({ success: false, message: 'Tuition post not found.' });
      return;
    }

    const tutor = await users.findOne(
      { email: tuition.tutorEmail },
      { projection: { password: 0 } }
    );

    res.status(200).json({
      success: true,
      data: {
        ...tuition,
        tutor
      }
    });
  } catch (error: any) {
    console.error('[TuitionController.getTuitionById] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tuition details.',
      error: error.message
    });
  }
};

export const createTuition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const {
      title,
      subject,
      classLevel,
      mode,
      location,
      monthlyFee,
      daysPerWeek,
      bannerImage,
      description
    } = req.body;

    if (!title || !subject || !classLevel || !mode || !monthlyFee || !daysPerWeek || !description) {
      res.status(400).json({
        success: false,
        message: 'All required tuition fields must be provided.'
      });
      return;
    }

    const { tuitions, users } = getCollections();

    // Check tutor's plan and post count
    const tutor = (await users.findOne({ email: req.user.email })) as IUser | null;
    const plan = tutor?.plan || 'free';

    if (plan === 'free') {
      const existingCount = await tuitions.countDocuments({ tutorEmail: req.user.email });
      if (existingCount >= 2) {
        res.status(403).json({
          success: false,
          code: 'PLAN_LIMIT_REACHED',
          message: 'Free Plan tutors can create up to 2 tuition posts. Please upgrade to Pro for unlimited postings.'
        });
        return;
      }
    }

    const newTuition: ITuition = {
      title: title.trim(),
      subject: subject.trim(),
      classLevel: classLevel.trim(),
      mode: mode === 'Offline' ? 'Offline' : 'Online',
      location: location ? location.trim() : (mode === 'Online' ? 'Online' : 'TBD'),
      monthlyFee: Number(monthlyFee),
      daysPerWeek: Number(daysPerWeek),
      bannerImage: bannerImage || 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',
      description: description.trim(),
      tutorName: req.user.name,
      tutorEmail: req.user.email,
      approvalStatus: 'pending',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await tuitions.insertOne(newTuition as any);
    newTuition._id = result.insertedId;

    res.status(201).json({
      success: true,
      message: 'Tuition post submitted successfully! Awaiting Admin approval.',
      data: newTuition
    });
  } catch (error: any) {
    console.error('[TuitionController.createTuition] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tuition post.',
      error: error.message
    });
  }
};

export const getMyTuitions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { tuitions } = getCollections();
    const items = await tuitions
      .find({ tutorEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error: any) {
    console.error('[TuitionController.getMyTuitions] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your tuitions.',
      error: error.message
    });
  }
};

export const updateTuition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const { tuitions } = getCollections();
    const existing = await tuitions.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Tuition not found.' });
      return;
    }

    if (existing.tutorEmail !== req.user.email && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Not authorized to edit this tuition.' });
      return;
    }

    const {
      title,
      subject,
      classLevel,
      mode,
      location,
      monthlyFee,
      daysPerWeek,
      bannerImage,
      description,
      isActive
    } = req.body;

    const updates: Partial<ITuition> = { updatedAt: new Date() };
    if (title) updates.title = title.trim();
    if (subject) updates.subject = subject.trim();
    if (classLevel) updates.classLevel = classLevel.trim();
    if (mode) updates.mode = mode;
    if (location !== undefined) updates.location = location.trim();
    if (monthlyFee !== undefined) updates.monthlyFee = Number(monthlyFee);
    if (daysPerWeek !== undefined) updates.daysPerWeek = Number(daysPerWeek);
    if (bannerImage) updates.bannerImage = bannerImage.trim();
    if (description) updates.description = description.trim();
    if (isActive !== undefined) updates.isActive = Boolean(isActive);

    const result = await tuitions.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updates },
      { returnDocument: 'after' }
    );

    res.status(200).json({
      success: true,
      message: 'Tuition updated successfully.',
      data: result
    });
  } catch (error: any) {
    console.error('[TuitionController.updateTuition] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tuition.',
      error: error.message
    });
  }
};

export const deleteTuition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const { tuitions, applications } = getCollections();
    const existing = await tuitions.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Tuition not found.' });
      return;
    }

    if (existing.tutorEmail !== req.user.email && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Not authorized to delete this tuition.' });
      return;
    }

    await tuitions.deleteOne({ _id: new ObjectId(id) });
    // Also cleanup linked applications
    await applications.deleteMany({ tuitionId: new ObjectId(id) });

    res.status(200).json({
      success: true,
      message: 'Tuition post and its applications deleted successfully.'
    });
  } catch (error: any) {
    console.error('[TuitionController.deleteTuition] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tuition.',
      error: error.message
    });
  }
};

export const toggleActiveStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid ID' });
      return;
    }

    const { tuitions } = getCollections();
    const existing = await tuitions.findOne({ _id: new ObjectId(id) });

    if (!existing) {
      res.status(404).json({ success: false, message: 'Tuition not found.' });
      return;
    }

    if (existing.tutorEmail !== req.user.email && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const newActiveState = !existing.isActive;
    await tuitions.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isActive: newActiveState, updatedAt: new Date() } }
    );

    res.status(200).json({
      success: true,
      message: `Tuition status changed to ${newActiveState ? 'Active' : 'Closed'}.`,
      isActive: newActiveState
    });
  } catch (error: any) {
    console.error('[TuitionController.toggleActiveStatus] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle status.',
      error: error.message
    });
  }
};

export const adminGetAllTuitions = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { tuitions } = getCollections();
    const items = await tuitions
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error: any) {
    console.error('[TuitionController.adminGetAllTuitions] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tuitions for admin.',
      error: error.message
    });
  }
};

export const adminUpdateApprovalStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid ID.' });
      return;
    }

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status.' });
      return;
    }

    const { tuitions } = getCollections();
    const result = await tuitions.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { approvalStatus: status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      res.status(404).json({ success: false, message: 'Tuition post not found.' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Tuition post has been marked as ${status}.`,
      data: result
    });
  } catch (error: any) {
    console.error('[TuitionController.adminUpdateApprovalStatus] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update approval status.',
      error: error.message
    });
  }
};
