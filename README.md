# DevDock — Local Project Command Center

A sleek browser-based dashboard that discovers and manages all your local dev projects from one place. Each project gets a card showing its status (running/stopped/crashed), and you can start, stop, or restart it with one click.

DevDock reads your `package.json` scripts, `docker-compose.yml`, `Makefile`, or a simple `.devdock.yml` config to know how to launch each project — no IDE needed.

## Features

- **Project Discovery** — Scans your directories for projects and auto-detects their configuration
- **Start/Stop/Restart** — One-click process management with real-time status updates
- **Log Streamer** — Live-tail logs from any running project with filtering, search, and error highlighting
- **Port Map** — Shows all active ports, maps them to projects, and flags conflicts
- **Health Pings** — Hits your health endpoints and shows green/red dots at a glance
- **Resource Monitor** — Per-project CPU and memory usage
- **Quick Notes** — Scratchpad on each project card for things you always forget
- **Deep Links** — Open in VS Code, GitHub, localhost, terminal, or file manager
- **Grouped Launch** — Define project groups and spin up entire stacks with one click
- **Session Memory** — Remembers your running projects and offers to restore on restart
- **Command Palette** — `Ctrl+K` to fuzzy-search and control any project from anywhere

## Quick Start

```bash
# Install dependencies
npm install

# Start both server and client in dev mode
npm run dev

# Or start them separately:
npm run dev:server   # Backend on http://localhost:3001
npm run dev:client   # Frontend on http://localhost:5173
```

Then open **http://localhost:5173** in your browser.

### First Run

1. Go to **Settings** in the sidebar
2. Add your project directories (e.g., `/home/user/projects`)
3. Click **Scan** in the header
4. Your projects appear as cards on the dashboard!

The `demo-projects/` directory is included with sample projects you can use to test immediately. Just add the path to that directory in Settings.

## Tech Stack

- **Backend:** Node.js + Express + Socket.IO + TypeScript
- **Frontend:** React 18 + Vite + TailwindCSS + Zustand + Socket.IO
- **Storage:** JSON file persistence (~/.devdock/state.json)
- **Monorepo:** npm workspaces

## Project Structure

```
├── server/          # Express + Socket.IO backend
│   └── src/
│       ├── routes/      # REST API endpoints
│       ├── services/    # Business logic
│       └── websocket/   # Real-time events
├── client/          # React + Vite frontend
│   └── src/
│       ├── components/  # UI components
│       ├── hooks/       # React hooks
│       ├── stores/      # Zustand state
│       └── lib/         # API & socket clients
├── shared/          # Shared TypeScript types
└── demo-projects/   # Sample projects for testing
```

## Configuration

### `.devdock.yml`

Add a `.devdock.yml` to any project for custom configuration:

```yaml
name: "My App"
scripts:
  start: "node server.js"
  dev: "node --watch server.js"
  test: "npm test"
health: "http://localhost:3000/health"
group: "my-stack"
```

### Supported Config Types

| File | Scripts Source |
|------|--------------|
| `package.json` | npm scripts (`npm run <script>`) |
| `Makefile` | Make targets (`make <target>`) |
| `docker-compose.yml` | Services (`docker-compose up <service>`) |
| `.devdock.yml` | Custom commands |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open command palette |
| `Escape` | Close panels and modals |
| `↑/↓` | Navigate command palette |
| `Enter` | Execute selected command |

## License

MIT
