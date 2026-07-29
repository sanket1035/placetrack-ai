# Contributing to PlaceTrack AI

Thank you for your interest in contributing to PlaceTrack AI! We welcome contributions from developers of all skill levels.

Please take a moment to read this guide before getting started. Following these guidelines ensures smooth collaboration and fast PR reviews.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Step-by-Step Local Setup Guide](#step-by-step-local-setup-guide)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Install Dependencies](#2-install-dependencies)
  - [3. Configure Environment Variables](#3-configure-environment-variables)
  - [4. Database Migration & Seeding](#4-database-migration--seeding)
  - [5. Start Development Servers](#5-start-development-servers)
- [Database Seeding Guide](#database-seeding-guide)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Format](#commit-message-format)
- [Pull Request Submission Checklist](#pull-request-submission-checklist)

---

## Prerequisites

Before starting, ensure you have the following installed on your machine:

- **Node.js**: `v20.0.0` or higher
- **Package Manager**: `npm` (v10+) or `pnpm` (v9+)
- **PostgreSQL**: `v14.0` or higher (running locally or via a cloud database like Supabase/Neon)
- **Git**: Latest version

---

## Step-by-Step Local Setup Guide

### 1. Clone the Repository

Clone your fork of the repository and navigate to the project directory:

```bash
git clone https://github.com/sanket1035/placetrack-ai.git
cd placetrack-ai
```

Add the original upstream repository as a remote:

```bash
git remote add upstream https://github.com/Sanket-103-pvt/placetrack-ai.git
```

### 2. Install Dependencies

Install workspace dependencies from the root directory:

```bash
npm install
```

*(Or using `pnpm`)*:

```bash
pnpm install
```

### 3. Configure Environment Variables

#### Backend Setup

Copy `.env.example` to `.env` in the `backend/` directory:

```bash
cp backend/.env.example backend/.env
```

Configure your `backend/.env` with your local PostgreSQL connection string:

```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/placetrack?schema=public"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/placetrack?schema=public"
JWT_SECRET="development-secret-key-change-in-production"
FRONTEND_URL="http://localhost:3000"

# Optional SMTP Mailer Configuration
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="your_smtp_user"
SMTP_PASS="your_smtp_password"
EMAIL_FROM="PlaceTrack AI <notifications@placetrack.ai>"
```

#### Frontend Setup

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL="http://localhost:4000"
```

### 4. Database Migration & Seeding

Navigate to the backend workspace to push the Prisma schema and seed initial data:

```bash
# Push Prisma schema to your PostgreSQL database
npm run prisma:push -w backend

# Generate Prisma Client
npm run prisma:generate -w backend

# Seed the database with initial demo accounts and placement drives
npm run prisma:seed -w backend
```

### 5. Start Development Servers

You can start both frontend and backend concurrently from the root workspace:

```bash
npm run dev
```

Or run each service individually:

```bash
# Start Backend API Server (http://localhost:4000)
npm run dev -w backend

# Start Frontend Next.js Web App (http://localhost:3000)
npm run dev -w frontend
```

---

## Database Seeding Guide

The database seed script (`backend/prisma/seed.ts`) populates your local environment with essential test datasets:

- **Demo Users**:
  - `student@placetrack.ai` (Password: `Demo@123`) — Student Role
  - `coordinator@placetrack.ai` (Password: `Demo@123`) — Coordinator Role
  - `admin@placetrack.ai` (Password: `Demo@123`) — Admin Role
- **Companies & Drives**: Seeded hiring partners (NVIDIA, TCS, Persistent, etc.) and placement drives.
- **Aptitude Tests & Questions**: Pre-configured mock tests and technical question banks.

To re-seed or reset your local database at any time:

```bash
# Reset database schema and re-run seed script
npm run prisma:push -w backend -- --force-reset
npm run prisma:seed -w backend
```

---

## Branch Naming Conventions

Always create a new branch from the latest `upstream/main` before writing code:

```bash
git fetch upstream
git checkout -b <prefix>/<short-description> upstream/main
```

Branch names **must** start with one of the following standard prefixes:

| Branch Prefix | Usage Description | Example |
|---|---|---|
| `feat/*` | New features or API additions | `feat/email-notifications` |
| `fix/*` | Bug fixes or issue resolutions | `fix/eligibility-modal-error` |
| `docs/*` | Documentation updates or inline comments | `docs/jsdoc-eligibility-service` |
| `refactor/*` | Code restructuring without feature change | `refactor/split-dashboard-modules` |
| `security/*` | Security enhancements & rate limiters | `security/auth-rate-limit` |
| `ci/*` | CI/CD pipeline or build script updates | `ci/github-actions-workflow` |

> ?? **One Issue = One Branch = One PR**. Never combine multiple unrelated issues into a single branch.

---

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. Keep summary lines under 72 characters.

### Format

```text
<type>(<scope>): <short description>
```

### Supported Types

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes only
- `style`: Changes that do not affect code logic (formatting, white-space)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `test`: Adding missing tests or updating existing tests
- `ci`: Changes to CI/CD configuration files and scripts
- `chore`: Maintenance tasks or dependency updates

### Examples

```bash
git commit -m "feat(auth): add JWT rate limiting middleware"
git commit -m "fix(drives): display specific eligibility failure reasons"
git commit -m "docs(readme): update setup instructions"
```

---

## Pull Request Submission Checklist

Before submitting a Pull Request (PR), verify each item on this checklist:

- [ ] **Up to Date**: Synced with latest `upstream/main` (`git fetch upstream && git merge upstream/main`).
- [ ] **Branch Name**: Follows `<prefix>/<description>` format (e.g. `feat/drive-patch-delete`).
- [ ] **TypeScript Check**: `npm run typecheck` passes with zero errors in both frontend and backend.
- [ ] **Production Build**: `npm run build` succeeds without compilation errors.
- [ ] **Tests Pass**: `npm test` runs cleanly in backend.
- [ ] **No Secrets Committed**: Verified no `.env`, `.env.local`, API keys, or `node_modules/` are staged.
- [ ] **Clean Code**: No leftover `console.log` statements, unused imports, or dead code.
- [ ] **PR Description**: Clear title matching `type(scope): description` and a detailed summary of changes.

Thank you for helping improve PlaceTrack AI! ??
