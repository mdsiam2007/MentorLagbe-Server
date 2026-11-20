import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { getCollections } from '../config/db';
import { IUser, ITuition, IApplication, IPayment } from '../models/types';

export const seedDatabase = async (): Promise<void> => {
  try {
    const { users, tuitions, applications, payments } = getCollections();

    const existingUsersCount = await users.countDocuments();
    if (existingUsersCount > 0) {
      console.log('[Seeder] Database already contains records. Skipping auto-seed.');
      return;
    }

    console.log('[Seeder] Starting fresh database seeding...');
    const salt = await bcrypt.genSalt(10);
    const adminPassword = await bcrypt.hash('Admin@12345', salt);
    const tutorPassword = await bcrypt.hash('Tutor@12345', salt);
    const studentPassword = await bcrypt.hash('Student@12345', salt);

    const initialUsers: IUser[] = [
      {
        name: 'Super Admin',
        email: 'admin@mentorlagbe.com',
        password: adminPassword,
        role: 'admin',
        plan: 'pro',
        phone: '+8801700000001',
        bio: 'Chief Platform Administrator at MentorLagbe.',
        image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Rahim Chowdhury (BUET CSE)',
        email: 'tutor.rahim@mentorlagbe.com',
        password: tutorPassword,
        role: 'tutor',
        plan: 'pro',
        phone: '+8801812345678',
        bio: 'Senior Software Engineer and seasoned mentor specializing in Higher Math, Physics, and Web Development.',
        image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Nusrat Jahan (DMC)',
        email: 'tutor.nusrat@mentorlagbe.com',
        password: tutorPassword,
        role: 'tutor',
        plan: 'free',
        phone: '+8801798765432',
        bio: 'Medical graduate with 5+ years experience mentoring Biology and Organic Chemistry for HSC & Admission seekers.',
        image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Siam Ahmed',
        email: 'student.siam@mentorlagbe.com',
        password: studentPassword,
        role: 'student',
        plan: 'pro',
        phone: '+8801611223344',
        bio: 'HSC Candidate preparing for University Admission tests. Passionate about Mathematics and Coding.',
        image: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80',
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: 'Afsana Mimi',
        email: 'student.afsana@mentorlagbe.com',
        password: studentPassword,
        role: 'student',
        plan: 'free',
        phone: '+8801555667788',
        bio: 'Passionate learner seeking English language fluency and IELTS academic preparation.',
        image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    const insertedUsers = await users.insertMany(initialUsers as any);
    console.log(`[Seeder] Seeded ${insertedUsers.insertedCount} users.`);

    const sampleTuitions: ITuition[] = [
      {
        title: 'HSC Higher Mathematics: Calculus & Algebra Special Batch',
        subject: 'Mathematics',
        classLevel: 'Class 11-12 (HSC)',
        mode: 'Online',
        location: 'Online via Zoom',
        monthlyFee: 3500,
        daysPerWeek: 3,
        bannerImage: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=80',
        description: 'Complete syllabus coverage of Higher Mathematics 1st and 2nd Paper with weekly board exam problem solving and real-time doubt clearing sessions.',
        tutorName: 'Rahim Chowdhury (BUET CSE)',
        tutorEmail: 'tutor.rahim@mentorlagbe.com',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Complete HSC Physics Mastery (Theory + Mathematical Problems)',
        subject: 'Physics',
        classLevel: 'Class 11-12 (HSC)',
        mode: 'Online',
        location: 'Online / Google Meet',
        monthlyFee: 4000,
        daysPerWeek: 4,
        bannerImage: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=1200&q=80',
        description: 'In-depth conceptual understanding of Mechanics, Waves, Thermodynamics, and Modern Physics. Includes creative question analysis and formula sheets.',
        tutorName: 'Rahim Chowdhury (BUET CSE)',
        tutorEmail: 'tutor.rahim@mentorlagbe.com',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Medical Admission Biology & HSC Zoology Crash Course',
        subject: 'Biology',
        classLevel: 'Admission & HSC',
        mode: 'Offline',
        location: 'Dhanmondi, Dhaka',
        monthlyFee: 5000,
        daysPerWeek: 3,
        bannerImage: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?auto=format&fit=crop&w=1200&q=80',
        description: 'High-yield diagram-based learning, chapter-wise MCQs, and memory retention techniques for Medical aspirants and Class 12 students.',
        tutorName: 'Nusrat Jahan (DMC)',
        tutorEmail: 'tutor.nusrat@mentorlagbe.com',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'IELTS Academic 7.5+ Target Batch: Writing & Speaking Mentorship',
        subject: 'English',
        classLevel: 'Undergraduate / Adults',
        mode: 'Online',
        location: 'Online 1-on-1',
        monthlyFee: 6000,
        daysPerWeek: 2,
        bannerImage: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80',
        description: 'Personalized evaluation of Task 1 and Task 2 essays with mock interview simulations and pronunciation improvement tips.',
        tutorName: 'Rahim Chowdhury (BUET CSE)',
        tutorEmail: 'tutor.rahim@mentorlagbe.com',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Next.js 15 & Full-Stack Modern Web Development Mentorship',
        subject: 'Programming',
        classLevel: 'All Levels',
        mode: 'Online',
        location: 'Online / Discord',
        monthlyFee: 4500,
        daysPerWeek: 3,
        bannerImage: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
        description: 'Learn modern web engineering: React, Next.js App Router, Tailwind CSS, TypeScript, MongoDB, and production deployment on Vercel.',
        tutorName: 'Rahim Chowdhury (BUET CSE)',
        tutorEmail: 'tutor.rahim@mentorlagbe.com',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'HSC Chemistry (Organic Chemistry Reaction Mechanisms Simplified)',
        subject: 'Chemistry',
        classLevel: 'Class 11-12 (HSC)',
        mode: 'Offline',
        location: 'Uttara Sector 7, Dhaka',
        monthlyFee: 4200,
        daysPerWeek: 3,
        bannerImage: 'https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?auto=format&fit=crop&w=1200&q=80',
        description: 'Demystifying name reactions, conversions, stoichiometry, and chemical bonding with hands-on practice worksheets.',
        tutorName: 'Nusrat Jahan (DMC)',
        tutorEmail: 'tutor.nusrat@mentorlagbe.com',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'SSC General Science & Math Foundation Batch (English Version)',
        subject: 'General Science',
        classLevel: 'Class 9-10 (SSC)',
        mode: 'Online',
        location: 'Online via Zoom',
        monthlyFee: 3000,
        daysPerWeek: 3,
        bannerImage: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80',
        description: 'Building rock-solid fundamentals for English version SSC students. Regular chapter quizzes and interactive problem solving.',
        tutorName: 'Rahim Chowdhury (BUET CSE)',
        tutorEmail: 'tutor.rahim@mentorlagbe.com',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Class 11-12 Information & Communication Technology (ICT)',
        subject: 'ICT',
        classLevel: 'Class 11-12 (HSC)',
        mode: 'Online',
        location: 'Online Batch',
        monthlyFee: 2500,
        daysPerWeek: 2,
        bannerImage: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1200&q=80',
        description: 'Covers Number Systems, Digital Logic, HTML, C Programming, and Database Management Systems with practical coding exercises.',
        tutorName: 'Rahim Chowdhury (BUET CSE)',
        tutorEmail: 'tutor.rahim@mentorlagbe.com',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Business Studies: HSC Accounting & Finance Strategic Batch',
        subject: 'Accounting',
        classLevel: 'Class 11-12 (HSC)',
        mode: 'Offline',
        location: 'Mirpur 10, Dhaka',
        monthlyFee: 3200,
        daysPerWeek: 3,
        bannerImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',
        description: 'Practical approach to Ledger, Trial Balance, Depreciation, and Financial Statement analysis for HSC Commerce students.',
        tutorName: 'Nusrat Jahan (DMC)',
        tutorEmail: 'tutor.nusrat@mentorlagbe.com',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Python for Kids and Absolute Beginners (Logic & Games)',
        subject: 'Programming',
        classLevel: 'Class 6-10',
        mode: 'Online',
        location: 'Online',
        monthlyFee: 3000,
        daysPerWeek: 2,
        bannerImage: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=1200&q=80',
        description: 'Fun, gamified coding classes using Python Turtle and Pygame. Inspiring young minds into creative computational thinking.',
        tutorName: 'Rahim Chowdhury (BUET CSE)',
        tutorEmail: 'tutor.rahim@mentorlagbe.com',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'O Level & A Level Physics & Pure Mathematics Masterclass',
        subject: 'Physics',
        classLevel: 'O/A Level (Cambridge/Edexcel)',
        mode: 'Online',
        location: 'Online 1-on-1',
        monthlyFee: 7000,
        daysPerWeek: 3,
        bannerImage: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80',
        description: 'Past paper solving from 2012-2024, topical question drills, examiner tips, and guaranteed A* grade preparation techniques.',
        tutorName: 'Rahim Chowdhury (BUET CSE)',
        tutorEmail: 'tutor.rahim@mentorlagbe.com',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date()
      },
      {
        title: 'Bengali Grammar & Literature Analytical Thinking (SSC & HSC)',
        subject: 'Bangla',
        classLevel: 'Class 9-12',
        mode: 'Offline',
        location: 'Dhanmondi, Dhaka',
        monthlyFee: 2800,
        daysPerWeek: 2,
        bannerImage: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80',
        description: 'Master Bengali 2nd paper grammar rules, essay writing, and analytical appreciation of classic literature pieces.',
        tutorName: 'Nusrat Jahan (DMC)',
        tutorEmail: 'tutor.nusrat@mentorlagbe.com',
        approvalStatus: 'approved',
        isActive: true,
        createdAt: new Date()
      }
    ];

    const insertedTuitions = await tuitions.insertMany(sampleTuitions as any);
    console.log(`[Seeder] Seeded ${insertedTuitions.insertedCount} tuition posts.`);

    // Seed sample connected applications
    const firstTuitionId = insertedTuitions.insertedIds[0];
    const sampleApplications: IApplication[] = [
      {
        tuitionId: firstTuitionId,
        tuitionTitle: sampleTuitions[0].title,
        subject: sampleTuitions[0].subject,
        monthlyFee: sampleTuitions[0].monthlyFee,
        tutorEmail: sampleTuitions[0].tutorEmail,
        studentName: 'Siam Ahmed',
        studentEmail: 'student.siam@mentorlagbe.com',
        studentPhone: '+8801611223344',
        preferredSchedule: 'Mon, Wed, Fri (7:00 PM - 8:30 PM)',
        studentNote: 'I need special attention on Integral Calculus and Differential Equations.',
        status: 'accepted',
        appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        tuitionId: insertedTuitions.insertedIds[1],
        tuitionTitle: sampleTuitions[1].title,
        subject: sampleTuitions[1].subject,
        monthlyFee: sampleTuitions[1].monthlyFee,
        tutorEmail: sampleTuitions[1].tutorEmail,
        studentName: 'Afsana Mimi',
        studentEmail: 'student.afsana@mentorlagbe.com',
        studentPhone: '+8801555667788',
        preferredSchedule: 'Sat, Mon, Wed (5:00 PM - 6:30 PM)',
        studentNote: 'Looking forward to improving my Physics conceptual clarity.',
        status: 'pending',
        appliedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ];

    await applications.insertMany(sampleApplications as any);
    console.log(`[Seeder] Seeded ${sampleApplications.length} sample applications.`);

    // Seed sample Stripe payment records
    const samplePayments: IPayment[] = [
      {
        userEmail: 'tutor.rahim@mentorlagbe.com',
        userName: 'Rahim Chowdhury (BUET CSE)',
        userRole: 'tutor',
        planName: 'Pro Tutor Plan',
        amount: 15,
        currency: 'USD',
        transactionId: 'txn_mock_tutor_pro_001',
        stripeSessionId: 'cs_test_mock_tutor_pro_001',
        paymentStatus: 'paid',
        paidAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        userEmail: 'student.siam@mentorlagbe.com',
        userName: 'Siam Ahmed',
        userRole: 'student',
        planName: 'Pro Student Plan',
        amount: 10,
        currency: 'USD',
        transactionId: 'txn_mock_student_pro_002',
        stripeSessionId: 'cs_test_mock_student_pro_002',
        paymentStatus: 'paid',
        paidAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    await payments.insertMany(samplePayments as any);
    console.log(`[Seeder] Seeded ${samplePayments.length} payment records.`);
    console.log('[Seeder] Database seeding completed successfully!');
  } catch (error: any) {
    console.error('[Seeder] Error during seeding:', error);
  }
};
