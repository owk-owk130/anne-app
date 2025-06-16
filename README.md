# Anne App Monorepo

This is a monorepo containing the frontend and backend for the Anne App.

## Project Structure

```text
anne-app/
├── app/              # Frontend (React + Tauri)
├── backend/          # Backend (Express + Bun)
├── package.json      # Root package.json with workspace configuration
├── biome.json        # Shared linting and formatting configuration
└── tsconfig.json     # Shared TypeScript configuration
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- [Node.js](https://nodejs.org/) (>= 18.0.0)

### Installation

Install dependencies for all packages:

```bash
bun install
```

### Development

Start both frontend and backend in development mode:

```bash
bun run dev
```

Or start them individually:

```bash
# Frontend only
bun run dev:app

# Backend only
bun run dev:backend
```

### Building

Build all packages:

```bash
bun run build
```

Or build individually:

```bash
# Frontend only
bun run build:app

# Backend only
bun run build:backend
```

### Linting and Formatting

Run linting and formatting across all packages:

```bash
# Lint all packages
bun run lint

# Fix linting issues
bun run lint:fix

# Format all packages
bun run format:fix

# Run full check (lint + format)
bun run check:fix
```

### Package Scripts

You can also run scripts for individual packages:

```bash
# Run script for frontend
bun run --cwd app <script-name>

# Run script for backend
bun run --cwd backend <script-name>
```

## Packages

### Frontend (`@anne-app/frontend`)

React-based frontend application with Tauri for desktop functionality.

- **Location**: `app/`
- **Tech Stack**: React, TypeScript, Vite, Tauri, TailwindCSS
- **Development**: `bun run dev:app`

### Backend (`@anne-app/backend`)

Express-based API server.

- **Location**: `backend/`
- **Tech Stack**: Express, TypeScript, Bun
- **Development**: `bun run dev:backend`

## Workspace Configuration

This monorepo uses Bun workspaces for dependency management and script orchestration. Each package maintains its own `package.json` with specific dependencies and scripts, while the root `package.json` provides workspace-level commands.
