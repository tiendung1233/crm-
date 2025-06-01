# Chat Application - Server Side

## Overview

Backend server for a real-time chat application between admin and users, built with Node.js + Express, using Socket.IO for real-time communication and Firebase Admin SDK for authentication and database.

## Tech Stack

- Node.js
- Express.js
- Socket.IO
- Firebase Admin SDK
- PostgreSQL (Sequelize)
- JWT
- Nodemailer
- bcryptjs

## Project Structure

```
server/
├── utils/              # Utility functions
│   ├── authService.js  # Authentication utilities
│   └── emailService.js # Email service
├── server.js          # Main server file
├── package.json       # Dependencies
└── .env              # Environment variables
```

## Features

### Authentication & Authorization

1. **Admin Authentication**

   - Firebase Admin SDK authentication
   - Custom token generation for admin
   - verifyAdmin middleware for admin routes

2. **User Authentication**

   - Firebase Admin SDK authentication
   - JWT token for user sessions
   - verifyUser middleware for user routes

3. **Password Management**
   - Password hashing with bcryptjs
   - Password reset flow
   - Email verification

### Database (Firestore)

1. **Collections**

   - users: User information
   - chats: Chat room information
   - messages: Chat messages
   - tasks: User tasks

2. **Data Models**

   ```typescript
   // User
   interface User {
     id: string;
     name: string;
     email: string;
     phone: string;
     role: "admin" | "user";
     status: "active" | "pending" | "disabled";
     createdAt: Timestamp;
     updatedAt: Timestamp;
   }

   // Chat
   interface Chat {
     id: string;
     participants: string[];
     lastMessage: Message;
     updatedAt: Timestamp;
   }

   // Message
   interface Message {
     sender: string;
     content: string;
     timestamp: number;
     createdAt: Timestamp;
   }

   // Task
   interface Task {
     id: string;
     userId: string;
     title: string;
     description: string;
     status: "pending" | "in_progress" | "completed";
     createdAt: Timestamp;
     updatedAt: Timestamp;
   }
   ```

### Real-time Communication

1. **Socket.IO Setup**

   - CORS configuration
   - Authentication middleware
   - Room management

2. **Socket Events**

   - Connection handling
   - Room joining
   - Message broadcasting
   - Disconnection handling

3. **Message Flow**
   - Save to Firestore
   - Broadcast to receiver
   - Update chat metadata

### API Endpoints

1. **Authentication**

   ```
   POST /api/check-user
   POST /api/login
   POST /api/set-password
   POST /api/update-admin-id
   ```

2. **User Management**

   ```
   GET /api/admin/users
   POST /api/employees
   PUT /api/admin/users/:userId
   DELETE /api/admin/users/:userId
   ```

3. **Task Management**

   ```
   GET /api/users/:userId/tasks
   POST /api/users/:userId/tasks
   PUT /api/users/:userId/tasks/:taskId
   DELETE /api/users/:userId/tasks/:taskId
   ```

4. **Chat System**
   ```
   GET /api/messages/:chatId
   POST /api/messages
   ```

### Email Service

- Nodemailer integration
- Password setup emails
- HTML email templates
- Error handling

## Setup & Installation

1. Install dependencies:

```bash
npm install
```

2. Create .env file:

```env
PORT=3000
JWT_SECRET=your_jwt_secret
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
FRONTEND_URL=http://localhost:5173
```

3. Firebase Admin Setup:

- Download service account key from Firebase Console
- Save JSON file as `firebaseAdminConfig.json`

4. Start server:

```bash
# Development
npm run dev

# Production
npm start
```

## Security Features

1. **Authentication**

   - Firebase Admin SDK verification
   - JWT token validation
   - Role-based access control

2. **Data Protection**

   - Password hashing
   - Secure session management
   - CORS configuration

3. **API Security**
   - Input validation
   - Error handling
   - Rate limiting (recommended)

## Error Handling

- Global error handler
- Custom error messages
- Logging system
- Client-friendly responses

## Best Practices

1. **Code Organization**

   - Modular structure
   - Separation of concerns
   - Utility functions

2. **Performance**

   - Connection pooling
   - Caching (recommended)
   - Efficient queries

3. **Maintenance**
   - Environment variables
   - Logging
   - Documentation
