# AssetOps

AssetOps is an internal infrastructure inventory web app for managing assets, access records, database inventory, and user accounts in one place.

## Current Scope

- Assets inventory with grouped access points and multi-node support
- Database inventory with real CRUD
- Database accounts with encrypted passwords, roles, and privileges
- Username-based authentication
- Admin user management
- Profile management with avatar upload or generated avatar

## Stack

### Frontend

- Next.js 16
- TypeScript
- Tailwind CSS
- shadcn/ui

### Backend

- NestJS
- Prisma
- PostgreSQL
- JWT authentication

## Main Modules

### Assets

- Track physical infrastructure assets
- Store multiple access points under one asset
- Support single assets and multi-node assets
- Show compact list view and dense detail view

### Database

- Store DB name, engine, environment, host, IP, port, owner, and notes
- Manage multiple database accounts per database
- Track account username, password, role, privileges, and notes
- Create, edit, delete, list, and inspect database records through real API endpoints

### Users

- Username + display name based accounts
- Admin can create users, change roles, reset passwords, and delete users
- Users can update profile, avatar, and password

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL
- npm

### Backend setup

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://assetops:ChangeMe%23Postgres2026!@localhost:5432/assetops_db?schema=public"
JWT_SECRET="ChangeMe-JWT-Secret-2026-Long-Random-Value"
CREDENTIAL_ENCRYPTION_KEY="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
DEFAULT_ADMIN_PASSWORD="ChangeMe#Admin2026!"
DEFAULT_EDITOR_PASSWORD="ChangeMe#Editor2026!"
PORT=3001
```

Apply schema and generate Prisma client:

```bash
npx prisma migrate deploy
npx prisma generate
```

Optional seed:

```bash
npx prisma db seed
```

Start backend:

```bash
npm run start:dev
```

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at [http://localhost:3000](http://localhost:3000)  
Backend API runs at [http://localhost:3001/api](http://localhost:3001/api)

## Default Access

Seeded default account:

- Username: `admin`
- Password: `ChangeMe#Admin2026!`

Change the seeded default passwords in `backend/.env` before using the app outside local setup.

Self-register is disabled. New users are created by an admin from the Users page.

## Useful Commands

### Backend

```bash
npm run start:dev
npm run build
npx prisma migrate deploy
npx prisma generate
```

### Frontend

```bash
npm run dev
npm run build
```

## Project Structure

- `backend/` NestJS API, Prisma schema, migrations, seeds
- `frontend/` Next.js app and UI components
- `backend/scripts/` import and maintenance scripts

## Notes

- Passwords for asset/database credentials are encrypted on the backend before storage
- If Prisma generate fails on Windows with an `EPERM` file lock, stop the running backend process and run `npx prisma generate` again

## License

UNLICENSED
