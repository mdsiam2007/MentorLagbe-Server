import { ObjectId } from 'mongodb';

export type UserRole = 'student' | 'tutor' | 'admin';
export type UserPlan = 'free' | 'pro';

export interface IUser {
  _id?: ObjectId;
  name: string;
  email: string;
  password?: string;
  image?: string;
  role: UserRole;
  phone?: string;
  bio?: string;
  plan: UserPlan;
  createdAt: Date;
  updatedAt?: Date;
}

export type TuitionMode = 'Online' | 'Offline';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface ITuition {
  _id?: ObjectId;
  title: string;
  subject: string;
  classLevel: string;
  mode: TuitionMode;
  location: string;
  monthlyFee: number;
  daysPerWeek: number;
  bannerImage: string;
  description: string;
  tutorName: string;
  tutorEmail: string;
  approvalStatus: ApprovalStatus;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected';

export interface IApplication {
  _id?: ObjectId;
  tuitionId: ObjectId | string;
  tuitionTitle: string;
  subject: string;
  monthlyFee: number;
  tutorEmail: string;
  studentName: string;
  studentEmail: string;
  studentPhone: string;
  preferredSchedule: string;
  studentNote?: string;
  status: ApplicationStatus;
  appliedAt: Date;
}

export interface IPayment {
  _id?: ObjectId;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  planName: string;
  amount: number;
  currency: string;
  transactionId: string;
  stripeSessionId: string;
  paymentStatus: 'paid';
  paidAt: Date;
}
