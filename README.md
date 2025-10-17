# Water Billing System

A comprehensive water billing management system for LGU Concepcion, Romblon. Built with React, Supabase database, and Bulma UI framework.

## Features

- **Custom Authentication**: Login against existing users table (not Supabase Auth)
- **Complete Navigation System**: 8 fully functional pages with dedicated components
- **Modern UI**: Built with Bulma CSS framework with water billing theme
- **Responsive Design**: Mobile-friendly design with collapsible sidebar
- **Protected Routes**: Dashboard accessible only after login
- **Session Management**: Persistent login state
- **Navigation Pages**:
  - **Dashboard**: Overview with statistics and user information
  - **Customers**: Coming soon - Customer management functionality
  - **Billing**: Coming soon - Billing management functionality  
  - **Payments**: Coming soon - Payment processing functionality
  - **Credit Management**: Coming soon - Credit management functionality
  - **Reports**: Coming soon - Reports and analytics functionality
  - **Users**: Coming soon - User management functionality
  - **Tools**: Coming soon - System tools and utilities functionality

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Supabase project with users table

## Database Schema

The application expects a `users` table with the following schema:

```sql
create table public.users (
  userid uuid not null,
  firstname text not null,
  lastname text not null,
  password text not null,
  department text null,
  position text null,
  role text null,
  email text null,
  status text null,
  datecreated timestamp with time zone null default now(),
  lastlogin timestamp with time zone null,
  constraint users_pkey primary key (userid),
  constraint users_email_key unique (email)
);
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Configuration

The Supabase configuration is located in `src/supabaseClient.js`. The current configuration includes:

- **Supabase URL**: https://rzyrhnupwzppwiudfuxk.supabase.co
- **Anon Key**: Already configured

## Usage

1. **Login**: Enter email and password to authenticate
2. **Dashboard**: View user information and access application features
3. **Logout**: Click logout in the dropdown menu

## Security Notes

- Passwords should be hashed using bcrypt before storing in the database
- Only users with `status = 'active'` can login
- User sessions are stored in localStorage
- The application updates the `lastlogin` timestamp on successful login

## Project Structure

```
src/
├── components/
│   ├── Login.js          # Login form component
│   ├── Dashboard.js      # Main dashboard component
│   └── ProtectedRoute.js # Route protection wrapper
├── authService.js        # Authentication logic
├── supabaseClient.js     # Supabase configuration
├── App.js               # Main app with routing
├── index.js             # React entry point
└── index.css            # Custom styles
```

## Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm run deploy` - Deploy to GitHub Pages
- `npm eject` - Eject from Create React App

## Deployment

This project is configured for GitHub Pages deployment.

### Quick Deploy
```bash
npm run deploy
```

This will deploy to: `https://cgst13.github.io/motwaterbillingv2`

### Custom Domain
See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions on:
- Setting up custom domains
- Configuring DNS records
- Environment variables
- Troubleshooting deployment issues

## Technologies Used

- **React 18** - Frontend framework
- **React Router** - Client-side routing
- **Supabase** - Backend database
- **Bulma** - CSS framework
- **bcryptjs** - Password hashing
