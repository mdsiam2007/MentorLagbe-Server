# MentorLagbe (Server API)

RESTful API and Authentication backend for MentorLagbe (Smart Tuition & Academic Mentorship Platform). Built with Node.js, Express, TypeScript, MongoDB Native Driver, JWT, Stripe Checkout, and ImgBB.

## 🚀 Purpose
Provides secure role-based services for student tuition discovery, tutor batch management, administrative approvals, Stripe Pro payment webhooks and session verifications, and safe image uploads.

## 🌟 Key Features
- **4 Core MongoDB Collections**: `users`, `tuitions`, `applications`, `payments`.
- **JWT & Role-Based Middleware**: `verifyToken`, `verifyStudent`, `verifyTutor`, `verifyAdmin`.
- **Dynamic Search & Filtering**: Regex search by title/subject, filters by mode and class level, server-side pagination with `.skip()` and `.limit()`.
- **Stripe Checkout & Verification**: Seamless Pro membership upgrades ($15 Tutor, $10 Student) with automatic plan activation.
- **ImgBB Upload Proxy**: Direct multipart image upload endpoint (`/api/upload`) keeping `IMGBB_API_KEY` 100% hidden on server.
- **AI Data Seeder**: Automatic initial seeding with 12 rich tuition posts, 5 accounts, sample applications, and transactions.

## 🔑 Test Credentials
| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@mentorlagbe.com` | `Admin@12345` |
| **Tutor** | `tutor.rahim@mentorlagbe.com` | `Tutor@12345` |
| **Student** | `student.siam@mentorlagbe.com` | `Student@12345` |

## 📦 Packages Used
- `express`: REST API web framework
- `mongodb`: Official MongoDB native driver
- `jsonwebtoken`: JWT sign & verification
- `bcryptjs`: Password hashing
- `stripe`: Payment gateway SDK
- `cors` & `dotenv`: Cross-Origin handling & environment variables
- `multer` & `axios`: File upload buffer handling & ImgBB proxy
- `typescript` & `ts-node-dev`: Type safety and live reloading

## 🛠️ Local Development
```bash
npm install
npm run dev
```
Server runs on [http://localhost:5000](http://localhost:5000).
