# George Steuart & Company Ltd — Job Portal

## Backend (PHP API)
Place the `backend` folder in your web server root (e.g., `htdocs` in XAMPP).
Configure `config.php` with your database credentials and SMTP settings.

## Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

## Database Setup
1. Open phpMyAdmin
2. Import `backend/database/gs_jobs.sql`
3. This creates the `gs_jobs` database with all tables and seed data

## Default Admin Login
- **Username:** superadmin
- **Password:** admin123

## API Base URL
Update `frontend/src/services/api.js` → `API_BASE` to match your PHP server URL.
