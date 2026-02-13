# Home Dashboard Studio

A dark-themed, highly configurable personal dashboard builder that helps entrepreneurs create a custom “home” for their information flow.

The app supports:

- Multi-dashboard layout builder
- Drag + resize widgets on a responsive canvas
- Visualization styles:
  - Stat cards
  - Feed/list
  - Timeline
  - Compact chart bars
- Integration connectors (MVP):
  - RSS
  - GitHub
  - Gmail
  - Google Calendar
  - Apple Calendar (ICS URL)

> This is currently optimized for personal/single-user usage.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Configure environment:

```bash
cp .env.example .env
```

3. Initialize local SQLite database:

```bash
npm run db:push
npm run db:seed
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Integration Configuration Notes

### RSS
- `feedUrls`: Comma-separated URLs in the UI.

### GitHub
- `owner` required
- `repo` optional
- `token` optional (recommended for higher rate limits/private data)

### Gmail
- Requires a Google OAuth access token with Gmail read scopes.
- Configure optional query (default: `is:unread in:inbox`).

### Google Calendar
- Requires Google OAuth access token with calendar read scope.
- `calendarId` defaults to `primary`.

### Apple Calendar (ICS)
- Use a private ICS subscription URL.

## Scripts

```bash
npm run dev        # start local dev server
npm run lint       # run ESLint
npm run build      # production build check
npm run db:generate
npm run db:push
npm run db:seed
```

## Architecture at a glance

- **Next.js App Router + TypeScript**
- **Prisma + SQLite** for local persistence
- **Connector abstraction** for normalized data fetching
- **Widget/config model** for generic renderable blocks
- **Dark-first UI** for clean, calm daily usage

## Security note

Connector credentials are currently stored in local SQLite config JSON for personal-use convenience.  
Before production multi-user deployment, add encrypted secret storage and provider OAuth flow hardening.
