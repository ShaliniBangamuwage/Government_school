# EduNexa

EduNexa is a full-stack education platform built as a monorepo for Sri Lankan curriculum learning, digital textbooks, tutoring, and interactive educational experiences.

It combines:
- a NestJS backend for APIs, Firebase auth, curriculum access, student management, content import, and AI-powered features
- a Next.js frontend for the student/admin experience
- shared TypeScript packages for constants, types, and validation logic
- a prototype simulator app for fraction learning

## Project overview

This application is designed to support:
- student and admin authentication
- curriculum and subject management
- textbook and course catalog access
- AI-assisted quiz and tutor features
- educational simulator generation
- brain-game interactions and interactive learning tools
- admin dashboard monitoring and user management

## Tech stack

### Frontend
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Firebase client SDK
- Vitest for testing

### Backend
- NestJS 11
- TypeScript
- Firebase Admin SDK
- Socket.IO
- Swagger
- Jest for testing

### Shared packages
- shared-types
- shared-constants
- shared-validation

### Monorepo tools
- pnpm workspaces
- Turbo

## Repository structure

```bash
.
├── apps/
│   ├── backend/
│   │   ├── src/
│   │   ├── scripts/
│   │   ├── package.json
│   │   └── jest.config.js
│   └── frontend/
│       ├── src/
│       ├── public/
│       ├── tests/
│       └── package.json
├── packages/
│   ├── shared-constants/
│   ├── shared-types/
│   └── shared-validation/
├── data/
├── scripts/
├── simulators-fractions-prototype/
├── .env.example
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.base.json
└── README.md
```

## Prerequisites

Before running the project, make sure you have:
- Node.js 20+
- pnpm 11+
- Firebase project setup
- Google Gemini API key (for AI features)
- Git for version control

## Installation

1. Clone the repository

```bash
git clone <your-repository-url>
cd school
```

2. Install dependencies

```bash
pnpm install
```

3. Create environment files

Copy the example file and update values for your environment:

```bash
cp .env.example .env
```

If the backend needs its own environment file, make sure a backend-specific `.env` exists in `apps/backend/` as configured in the NestJS app.

## Environment variables

Example values are defined in `.env.example`:

```env
# Frontend
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abcdef
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api

# Backend
PORT=4000
AI_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.6-flash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@example.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
```

## Running the project

### Start both apps together

```bash
pnpm dev
```

This runs the monorepo through Turbo.

### Run frontend only

```bash
pnpm dev:frontend
```

### Run backend only

```bash
pnpm dev:backend
```

## Useful scripts

From the root:

```bash
pnpm build
pnpm lint
pnpm type-check
pnpm test
pnpm format
```

### Backend-specific scripts

```bash
cd apps/backend
pnpm build
pnpm start:dev
pnpm test
pnpm type-check
```

### Frontend-specific scripts

```bash
cd apps/frontend
pnpm dev
pnpm build
pnpm test
pnpm type-check
```

## Features

### Backend capabilities
- authentication and user role management
- admin dashboard analytics
- curriculum access and offerings
- textbook and course import workflows
- AI-powered quiz and tutor generation
- simulator generation tools
- educational content catalog integration
- real-time communication with Socket.IO

### Frontend capabilities
- responsive web application for students and admins
- curriculum browsing and access management
- interactive learning interfaces
- educational simulators and games
- dashboards and analytics views

## Firebase setup

This project uses Firebase for authentication and backend services. Make sure your Firebase project is configured and the environment variables match your project values.

You may also need to configure the following files as part of your Firebase setup:
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`

## Development notes

- The workspace uses pnpm workspaces and Turbo orchestration.
- Shared packages are referenced as workspace dependencies.
- The backend runs as a NestJS API, while the frontend is a Next.js app in the same monorepo.
- Data import scripts exist for curriculum and textbook integration.

## Recommended GitHub setup

Before pushing to GitHub:

1. Create a new repository on GitHub.
2. Run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-url>
git push -u origin main
```

3. Add a `.gitignore` if needed and verify secrets are not committed.

## Notes

This README is written for project onboarding and GitHub visibility. You can expand it further with screenshots, deployment instructions, and architecture diagrams as the project grows.
