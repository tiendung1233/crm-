# Chat Application - Client Side

## Overview

A real-time chat application between admin and users, built with React + TypeScript, using Socket.IO for real-time communication and Firebase for authentication.

## Tech Stack

- React 18
- TypeScript
- Socket.IO Client
- Firebase Authentication
- Tailwind CSS
- React Router v6
- Axios

## Project Structure

```
client/
├── src/
│   ├── components/         # Shared components
│   ├── contexts/          # React contexts (Auth, Socket)
│   ├── pages/             # Page components
│   │   ├── admin/        # Admin pages
│   │   └── users/        # User pages
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
```

## Features

### Authentication

1. **Admin Login**

   - Phone number authentication
   - Firebase Authentication integration
   - reCAPTCHA security
   - Token storage in localStorage

2. **User Login**
   - Email/password authentication
   - Firebase Authentication integration
   - User data and token storage

### Admin Features

1. **Dashboard**

   - System overview
   - User/task statistics

2. **Employee Management**

   - Employee listing
   - Add new employees
   - Update employee information
   - Delete employees
   - Send password setup emails to new employees

3. **Task Management**

   - Create tasks for users
   - View user task lists
   - Update task status
   - Delete tasks

4. **Chat System**
   - User list for chat
   - Real-time message sending/receiving
   - Chat history
   - Online/offline status display

### User Features

1. **Dashboard**

   - Personal information view
   - Assigned tasks list

2. **Task Management**

   - View task list
   - Update task status
   - View task details

3. **Chat System**
   - Chat with admin
   - Real-time message sending/receiving
   - Chat history
   - Online/offline status display

## Real-time Communication

- Socket.IO for real-time chat
- Socket Context for connection management
- Room joining based on role (admin/user)
- Event handling: connect, disconnect, sendMessage, receiveMessage

## Setup & Installation

1. Install dependencies:

```bash
npm install
```

2. Create .env file:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. Start development server:

```bash
npm run dev
```

## API Endpoints

- Authentication:

  - POST /api/login
  - POST /api/check-user
  - POST /api/set-password

- Admin APIs:

  - GET /api/admin/users
  - POST /api/employees
  - PUT /api/admin/users/:userId
  - DELETE /api/admin/users/:userId

- Task APIs:

  - GET /api/users/:userId/tasks
  - POST /api/users/:userId/tasks
  - PUT /api/users/:userId/tasks/:taskId
  - DELETE /api/users/:userId/tasks/:taskId

- Chat APIs:
  - GET /api/messages/:chatId
  - POST /api/messages

## Socket Events

- Client to Server:

  - joinRoom: Join chat room
  - sendMessage: Send message

- Server to Client:
  - receiveMessage: Receive new message
  - connect: Connection established
  - disconnect: Connection lost
