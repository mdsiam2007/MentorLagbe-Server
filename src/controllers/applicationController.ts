import { Response } from 'express';
import { ObjectId } from 'mongodb';
import { getCollections } from '../config/db';
import { AuthenticatedRequest } from '../middleware/auth';
import { IApplication, ITuition } from '../models/types';

export const applyForTuition = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    if (req.user.role !== 'student') {
      res.status(403).json({
        success: false,
        message: 'Only registered students can apply for tuitions.'
      });
      return;
    }

    const { tuitionId, studentPhone, preferredSchedule, studentNote } = req.body;

    if (!tuitionId || !studentPhone || !preferredSchedule) {
      res.status(400).json({
        success: false,
        message: 'Tuition ID, phone number, and preferred schedule are required.'
      });
      return;
    }

    if (typeof studentPhone !== 'string' || studentPhone.trim().length < 6) {
      res.status(400).json({
        success: false,
        message: 'Please provide a valid phone number (at least 6 digits).'
      });
      return;
    }

    if (typeof preferredSchedule !== 'string' || preferredSchedule.trim().length < 2) {
      res.status(400).json({
        success: false,
        message: 'Preferred schedule must be provided.'
      });
      return;
    }

    if (!ObjectId.isValid(tuitionId)) {
      res.status(400).json({ success: false, message: 'Invalid tuition ID.' });
      return;
    }

    const { tuitions, applications } = getCollections();
    const tuition = (await tuitions.findOne({ _id: new ObjectId(tuitionId) })) as ITuition | null;

    if (!tuition) {
      res.status(404).json({ success: false, message: 'Tuition post not found.' });
      return;
    }

    if (tuition.tutorEmail === req.user.email) {
      res.status(400).json({
        success: false,
        message: 'You cannot apply to your own tuition batch.'
      });
      return;
    }

    if (tuition.approvalStatus !== 'approved' || !tuition.isActive) {
      res.status(400).json({
        success: false,
        message: 'This tuition listing is not currently open for applications.'
      });
      return;
    }

    // Check duplicate application
    const existingApplication = await applications.findOne({
      tuitionId: new ObjectId(tuitionId),
      studentEmail: req.user.email
    });

    if (existingApplication) {
      res.status(409).json({
        success: false,
        message: 'You have already applied for this tuition batch. Please check your dashboard.'
      });
      return;
    }

    const newApplication: IApplication = {
      tuitionId: new ObjectId(tuitionId),
      tuitionTitle: tuition.title,
      subject: tuition.subject,
      monthlyFee: tuition.monthlyFee,
      tutorEmail: tuition.tutorEmail,
      studentName: req.user.name,
      studentEmail: req.user.email,
      studentPhone: studentPhone.trim(),
      preferredSchedule: preferredSchedule.trim(),
      studentNote: studentNote ? studentNote.trim() : '',
      status: 'pending',
      appliedAt: new Date()
    };

    const result = await applications.insertOne(newApplication as any);
    newApplication._id = result.insertedId;

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully! The tutor will review your request.',
      data: newApplication
    });
  } catch (error: any) {
    console.error('[ApplicationController.applyForTuition] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application.',
      error: error.message
    });
  }
};

export const getStudentApplications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { applications } = getCollections();
    const items = await applications
      .find({ studentEmail: req.user.email })
      .sort({ appliedAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error: any) {
    console.error('[ApplicationController.getStudentApplications] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student applications.',
      error: error.message
    });
  }
};

export const cancelApplication = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid ID.' });
      return;
    }

    const { applications } = getCollections();
    const app = await applications.findOne({ _id: new ObjectId(id) });

    if (!app) {
      res.status(404).json({ success: false, message: 'Application not found.' });
      return;
    }

    if (app.studentEmail !== req.user.email) {
      res.status(403).json({ success: false, message: 'Unauthorized.' });
      return;
    }

    if (app.status !== 'pending') {
      res.status(400).json({
        success: false,
        message: `Cannot cancel an application that is already ${app.status}.`
      });
      return;
    }

    await applications.deleteOne({ _id: new ObjectId(id) });

    res.status(200).json({
      success: true,
      message: 'Application has been successfully cancelled.'
    });
  } catch (error: any) {
    console.error('[ApplicationController.cancelApplication] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel application.',
      error: error.message
    });
  }
};

export const getTutorApplicants = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const { applications } = getCollections();
    const items = await applications
      .find({ tutorEmail: req.user.email })
      .sort({ appliedAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      data: items
    });
  } catch (error: any) {
    console.error('[ApplicationController.getTutorApplicants] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applicants.',
      error: error.message
    });
  }
};

export const updateApplicantStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const id = req.params.id as string;
    const { status } = req.body;

    if (!id || !ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid Application ID.' });
      return;
    }

    if (!['accepted', 'rejected'].includes(status)) {
      res.status(400).json({ success: false, message: 'Status must be accepted or rejected.' });
      return;
    }

    const { applications } = getCollections();
    const app = await applications.findOne({ _id: new ObjectId(id) });

    if (!app) {
      res.status(404).json({ success: false, message: 'Application not found.' });
      return;
    }

    if (app.tutorEmail !== req.user.email && req.user.role !== 'admin') {
      res.status(403).json({ success: false, message: 'Unauthorized.' });
      return;
    }

    const result = await applications.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    res.status(200).json({
      success: true,
      message: `Application marked as ${status}.`,
      data: result
    });
  } catch (error: any) {
    console.error('[ApplicationController.updateApplicantStatus] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application status.',
      error: error.message
    });
  }
};
