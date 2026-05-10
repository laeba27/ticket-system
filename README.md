# Ethata — Ticket Management System

A production-grade support ticket management system built with Next.js 16, Supabase, and Tailwind CSS v4. Designed for teams that need structured ticket workflows with role-based access control, SLA tracking, and developer task management.

---

## Features

### Core Ticket Management
- **Create & manage tickets** with title, description, priority, and optional due date
- **Status workflow**: Open → In Progress → Resolved → Closed
- **Priority levels**: Critical, High, Medium, Low — each with automatic SLA due dates
- **Assignment**: Support/admin can assign tickets to developers
- **Ticket timeline**: Append-only audit trail of all changes (status, priority, assignment, comments)
- **Internal notes**: Staff-only comments invisible to agents (enforced at RLS level)

### SLA / Due Dates
- Auto-calculated due dates based on priority: Critical = 4h, High = 24h, Medium = 3d, Low = 7d
- Agents can optionally override the due date when creating a ticket
- Overdue tickets show a red badge on the ticket list and detail page
- "Due soon" (within 2h) shows an amber badge
- Dashboard stat card shows total overdue ticket count

### Ticket Tags / Labels
- Colored tags: Bug, Feature Request, Billing, UI/UX, Security, Performance, Documentation
- Support/admin can attach multiple tags per ticket
- Tags display as color-coded badges on ticket rows and detail pages
- Tag filter on the tickets list page

### Kanban Board View
- Toggle between Table and Board views on `/tickets`
- Four columns: Open, In Progress, Resolved, Closed
- Drag-and-drop cards to change status (powered by `@dnd-kit/core`)
- Cards show priority, tags, assignee, and overdue badges
- Click any card to open the ticket detail

### ⌘K Command Palette
- Global keyboard shortcut: `⌘K` (Mac) / `Ctrl+K` (Windows)
- Search tickets by title in real time
- Navigate to any page directly from the palette
- Role-aware: agents don't see admin-only actions
- Quick-create ticket shortcut

### @Mentions in Comments
- Type `@` in any comment field to open a floating user picker
- Arrow key navigation + Enter/Tab to insert
- Mentions rendered in amber in the comment display
- Agents cannot mention anyone (restricted by role)
- Uses invisible Unicode terminator (`U+2060`) for precise highlight matching

### Developer Task Management (Todos)
- Support/admin can create tasks linked to tickets
- Developers see their assigned tasks in `/todos`
- Each todo has its own detail page with status management and internal comments
- Task status tracked independently from parent ticket

### Notifications
- Bell icon in the top-right topbar
- Shows assignment, comments, status changes, priority changes, and new tasks
- Unread count badge resets via "Mark all read" (stored in `localStorage`)
- Click any notification to jump to the relevant ticket

### Role-Based Access Control
- Four roles enforced at both RLS and API level
- Sidebar navigation filtered by role
- Command palette actions filtered by role

---

## Role Permissions

| Action | Agent | Developer | Support | Admin |
|---|---|---|---|---|
| Create ticket | ✅ | ❌ | ❌ | ✅ |
| View own tickets | ✅ | ❌ | ✅ | ✅ |
| View all tickets | ❌ | ✅ | ✅ | ✅ |
| Change ticket status | ✅ (own) | ❌ | ✅ | ✅ |
| Change ticket priority | ❌ | ❌ | ✅ | ✅ |
| Assign ticket | ❌ | ❌ | ✅ | ✅ |
| Add public comment | ✅ | ✅ | ✅ | ✅ |
| Add internal note | ❌ | ✅ | ✅ | ✅ |
| View internal notes | ❌ | ✅ | ✅ | ✅ |
| Add/remove tags | ❌ | ❌ | ✅ | ✅ |
| Create task (todo) | ❌ | ❌ | ✅ | ✅ |
| Change task status | ❌ | ✅ (own) | ❌ | ✅ |
| Manage users | ❌ | ❌ | ✅ | ✅ |
| Use @mentions | ❌ | ✅ | ✅ | ✅ |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth + `@supabase/ssr` |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Icons | Lucide React |
| Theme | `next-themes` |

---

## Database Schema

### Tables

```
profiles
├── id (uuid, FK → auth.users)
├── email (text)
├── full_name (text)
├── role (enum: admin | support | developer | agent)
└── created_at

tickets
├── id (uuid, PK)
├── title (text)
├── description (text)
├── status (enum: open | in_progress | resolved | closed)
├── priority (enum: critical | high | medium | low)
├── created_by (uuid, FK → profiles)
├── assigned_to (uuid, FK → profiles, nullable)
├── due_at (timestamptz, nullable)
└── created_at

ticket_events
├── id (uuid, PK)
├── ticket_id (uuid, FK → tickets)
├── author_id (uuid, FK → profiles)
├── type (text: ticket_created|status_changed|priority_changed|assigned|todo_created|todo_status_changed|comment)
├── body (text, nullable)
├── old_value (text, nullable)
├── new_value (text, nullable)
├── is_internal (boolean, default false)
├── todo_id (uuid, FK → todos, nullable)
└── created_at

todos
├── id (uuid, PK)
├── ticket_id (uuid, FK → tickets)
├── title (text)
├── status (enum: pending | in_progress | done)
├── assigned_to (uuid, FK → profiles)
├── created_by (uuid, FK → profiles)
└── created_at

tags
├── id (uuid, PK)
├── name (text, unique)
├── color (text)
└── created_at

ticket_tags
├── ticket_id (uuid, FK → tickets)
├── tag_id (uuid, FK → tags)
└── PRIMARY KEY (ticket_id, tag_id)
```

### Entity Relationships

```
auth.users
    │
    └── profiles (1:1)
            │
            ├── tickets.created_by (1:many)
            ├── tickets.assigned_to (1:many)
            ├── ticket_events.author_id (1:many)
            └── todos.assigned_to (1:many)

tickets (1:many) ──── ticket_events
tickets (1:many) ──── todos
tickets (many:many) ── ticket_tags ──── tags
todos   (1:many) ──── ticket_events (via todo_id)
```

### Row Level Security Overview

- **profiles**: All authenticated users can read; users can update their own
- **tickets**: Agents see only their own tickets; developers/support/admin see all
- **ticket_events**: `is_internal = true` events are hidden from agents entirely
- **todos**: Agents cannot see todos; developers see only their assigned todos
- **tags / ticket_tags**: All authenticated users can read; support/admin can write

---

## Running Locally

### Prerequisites
- Node.js 20+
- A Supabase project (free tier works)

### 1. Clone and install

```bash
git clone <repo-url>
cd ethata
npm install
```

If you cloned an existing repo and want to push to your own GitHub project, update the remote first:

```bash
git remote remove origin
git remote add origin <your-github-repo-url>
```

### 2. Configure environment variables

Create `.env.local` from `.env.example` and fill in your own Supabase values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Both values are in your Supabase project → Settings → API.

### 3. Set up the database

Run the SQL files in this order in your Supabase SQL Editor:

```
1. supabase/schema.sql            — core tables, triggers, RLS helpers, and base policies
2. supabase/comments_timeline.sql  — ticket_events table and comment timeline RLS
3. supabase/sla.sql                — adds due_at to tickets
4. supabase/tags.sql               — tags + ticket_tags tables with default seed tags
5. supabase/seed.sql               — optional sample users, tickets, and todos
```

> **Important**: Run them in order. `seed.sql` is optional and assumes the earlier schema files have already been applied.

### 4. Create test users

In Supabase → Authentication → Users, create accounts. Then in the SQL Editor, set their roles:

```sql
-- Make a user an admin
UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';

-- Make a user a support agent
UPDATE public.profiles SET role = 'support' WHERE email = 'support@example.com';

-- Make a user a developer
UPDATE public.profiles SET role = 'developer' WHERE email = 'dev@example.com';

-- Agents are the default role (created automatically on signup)
```

### 5. Start the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## Deploying to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### 2. Import to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project
2. Import your GitHub repository
3. Framework: **Next.js** (auto-detected)

### 3. Add environment variables

In Vercel → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL      = https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key
```

### 4. Configure Supabase for production

In Supabase → Authentication → URL Configuration:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/**`

### 5. Deploy

Click **Deploy**. Vercel will build and deploy automatically. Future pushes to `main` trigger automatic redeployments.

---

## Project Structure

```
ethata/
├── app/
│   ├── (auth)/
│   │   └── login/               # Login page
│   ├── (dashboard)/
│   │   ├── layout.js            # Dashboard shell (sidebar + topbar)
│   │   ├── dashboard/           # Stats overview
│   │   ├── tickets/
│   │   │   ├── page.js          # Ticket list (table + kanban)
│   │   │   ├── new/page.js      # Create ticket form
│   │   │   └── [id]/page.js     # Ticket detail
│   │   ├── todos/
│   │   │   ├── page.js          # My tasks list
│   │   │   └── [id]/page.js     # Todo detail
│   │   └── users/page.js        # User management (admin/support)
│   └── api/
│       ├── tickets/
│       │   ├── route.js              # GET list, POST create
│       │   └── [id]/
│       │       ├── route.js          # GET, PATCH, DELETE
│       │       ├── events/route.js   # Timeline events + comments
│       │       └── tags/route.js     # Attach/detach tags
│       ├── todos/
│       │   ├── route.js         # GET list, POST create
│       │   └── [id]/route.js    # GET, PATCH
│       ├── tags/route.js        # GET all tags
│       ├── users/route.js       # GET team members
│       └── notifications/route.js   # GET notifications
├── components/
│   ├── layout/
│   │   ├── Sidebar.js           # Collapsible sidebar with role-filtered nav
│   │   └── NotificationBell.js  # Topbar bell + dropdown
│   ├── tickets/
│   │   ├── TicketRow.js         # Table row with overdue + tag badges
│   │   ├── TicketTimeline.js    # Timeline + comment form
│   │   ├── TagSelect.js         # Tag picker + TagBadge component
│   │   ├── KanbanBoard.js       # Drag-and-drop board
│   │   └── AssignModal.js       # Developer assignment dialog
│   ├── todos/
│   │   └── TodoCommentSection.js # Internal comments on todos
│   ├── ui/
│   │   ├── MentionTextarea.js   # @mention-aware textarea + CommentBody
│   │   ├── Badge.js             # RoleBadge, StatusBadge, PriorityBadge
│   │   └── ...                  # shadcn/ui components
│   └── CommandPalette.js        # ⌘K global search
├── lib/
│   ├── supabase/
│   │   ├── client.js            # Browser Supabase client
│   │   └── server.js            # Server Supabase client + getProfile()
│   └── utils.js                 # cn() helper
└── supabase/
    ├── schema.sql
    ├── rls.sql
    ├── functions.sql
    ├── sla.sql
    └── tags.sql
```

---

## Key Design Decisions

### Append-Only Event Log
All ticket changes (status, priority, assignment, comments) are written to `ticket_events` rather than mutating ticket fields in place. This gives a full audit trail for free and powers the timeline UI.

### Two-Layer Security
Every sensitive operation is checked at both the Supabase RLS level (database) and the API route level (server). RLS is the source of truth — API checks are defense-in-depth.

### `is_internal` at RLS
Internal notes are filtered out for agents at the database query level, not in application code. This means even a buggy API route can't accidentally leak internal comments to agents.

### Mention Terminator
`@mentions` use an invisible Unicode word-joiner character (`U+2060`) as a terminator. This is stored in the database and used for regex matching on display. It's invisible in the textarea and in rendered text, solving the "how do you know where the mention ends" problem without brackets or other visual noise.

### Graceful Tag Fallback
The tickets API checks for the existence of `ticket_tags` in the query error and falls back to a query without that join. This means the app works even if the tags migration hasn't been run yet.

### Notification Read State in localStorage
Notifications don't require a separate database table. The "last seen" timestamp is stored in `localStorage`. This is a deliberate tradeoff: simpler implementation, but read state doesn't sync across devices.
