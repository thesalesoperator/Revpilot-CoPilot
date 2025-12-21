# RevPilot - Commission Calculator & Tracker

A beautiful, modern commission tracking application for sales representatives to track their sales, calculate commissions, and project future earnings.

## Features

- **Sales Dashboard**: Track all your sales in one place
  - Add new sales with detailed payment plans
  - Track total cash collected, contracted value, and outstanding payments
  - View guaranteed and potential commissions
  - Mark sales as refunded when necessary
  - Edit and delete sales

- **Payment Tracking**: Manage payment schedules
  - Automatically generated payment schedules
  - Mark individual payments as paid
  - Track remaining payments

- **Sales Projections**: Plan your earnings
  - Add projected sales to calculate potential commissions
  - Quick scenarios for 5 or 10 sales
  - Goal calculations to hit income targets

- **Settings**: Customize your experience
  - Set up commission pay schedules
  - Save products for quick sale entry
  - Manage your profile

## Tech Stack

- **Frontend**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/revpilot-commission-calculator.git
cd revpilot-commission-calculator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to the SQL Editor and run the schema from `supabase/schema.sql`
3. Copy your project URL and anon key from Settings > API

### 4. Configure environment variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── dashboard/          # Main sales dashboard
│   ├── projections/        # Sales projections page
│   ├── settings/           # User settings
│   ├── login/              # Login page
│   └── signup/             # Signup page
├── components/
│   ├── layout/             # Layout components (Sidebar, DashboardLayout)
│   └── ui/                 # UI components (Modal, StatCard, Toast, etc.)
├── contexts/               # React contexts (Auth)
├── lib/
│   ├── supabase/           # Supabase client setup
│   └── utils.ts            # Utility functions
└── types/                  # TypeScript types
```

## Color Scheme

- **Dark Background**: #00102e
- **Teal Accent**: #00ffc1
- **Orange Gradient**: #ff0043 → #ff9855 → #ffbe57

## Deployment

### Deploy on Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

## License

MIT License
