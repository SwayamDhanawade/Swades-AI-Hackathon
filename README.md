# Swades AI - Reliable Recording Pipeline

A fault-tolerant audio recording system that guarantees **zero data loss**. Built for the Swades AI Hackathon.

## Overview

Recording audio in chunks with network reliability is challenging. This project implements a pipeline that ensures recordings are never lost—even during network failures, browser crashes, or service outages.

### The Problem

When recording audio and uploading in chunks:
- Network drops can lose partial recordings
- Browser crashes before upload = data gone
- Bucket failures leave orphaned database records
- Retries can cause duplicates

### The Solution

```
Browser → OPFS → Bucket → Database (ack only after bucket confirms)
```

Chunks are persisted to OPFS *before* upload. The database is only acknowledged *after* the bucket confirms receipt.

## Features

- **Client-side chunking** - 5-second WAV chunks at 16kHz/16-bit PCM
- **OPFS persistence** - Durable browser storage before any network call
- **Idempotent uploads** - Safe retries with unique chunk IDs and checksums
- **Ordered acknowledgment** - DB write only after bucket confirms
- **Auto-reconciliation** - Detects and repairs missing chunks automatically

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, TailwindCSS, shadcn/ui |
| Backend | Hono.js, Node.js |
| Database | PostgreSQL, Drizzle ORM |
| Storage | MinIO (S3-compatible) |
| Monorepo | Turborepo |

## Getting Started

### Prerequisites

- Node.js v18+
- PostgreSQL v14+
- MinIO or any S3-compatible storage

### Installation

```bash
# Clone and install
npm install

# Configure environment
cp apps/server/.env.example apps/server/.env
# Edit .env with your credentials

# Start MinIO
minio.exe server C:\minio-data --console-address ":9001"
# Create bucket named 'recordings' via http://localhost:9001

# Create database
psql -U postgres -c "CREATE DATABASE recording_db;"

# Push schema
npm run db:push

# Start development
npm run dev
```

**Web App:** http://localhost:3001  
**API Server:** http://localhost:3000

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/recording_db
CORS_ORIGIN=http://localhost:3001
BUCKET_ENDPOINT=http://localhost:9000
BUCKET_REGION=us-east-1
BUCKET_NAME=recordings
BUCKET_ACCESS_KEY=minioadmin
BUCKET_SECRET_KEY=minioadmin
BUCKET_PUBLIC_URL=http://localhost:9000/recordings
NEXT_PUBLIC_SERVER_URL=http://localhost:3000/api
```

## How It Works

### Data Flow

1. **Record** - User clicks record, audio chunks are created every 5 seconds
2. **Persist** - Each chunk is saved to OPFS immediately
3. **Upload** - Chunks are uploaded to S3 bucket
4. **Acknowledge** - Database record created only after bucket confirms success
5. **Cleanup** - OPFS chunk deleted only after both bucket + DB confirmed

### Reliability Guarantees

| Failure Scenario | How It's Handled |
|-----------------|------------------|
| Network drop during upload | Chunk stays in OPFS, retry on reconnect |
| Browser crash | Chunks survive in OPFS, re-upload on reload |
| Bucket failure | Upload fails, no DB ack written |
| DB write fails | Chunk in bucket orphaned, reconciliation repairs |
| Chunk missing from bucket | Reconciliation detects and triggers re-upload |

## Project Structure

```
.
├── apps/
│   ├── web/           # Next.js frontend
│   │   └── src/
│   │       ├── app/           # Pages and layouts
│   │       ├── components/     # UI components
│   │       ├── hooks/         # Recording & upload hooks
│   │       └── lib/           # OPFS utilities
│   └── server/        # Hono API server
│       └── src/
│           ├── routes/        # API endpoints
│           └── lib/           # Storage client
├── packages/
│   ├── ui/            # Shared shadcn components
│   ├── db/            # Drizzle schema
│   └── env/           # Environment validation
└── turbo.json         # Monorepo config
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/session` | Create recording session |
| POST | `/api/chunks/upload` | Upload audio chunk |
| GET | `/api/chunks/status/:id` | Check chunk acknowledgment |
| POST | `/api/chunks/verify/:id` | Verify session integrity |
| POST | `/api/reconcile/check/:id` | Check chunk health |
| POST | `/api/reconcile/repair/:id` | Trigger repair for session |

## Available Scripts

```bash
npm run dev          # Start all apps
npm run build        # Build all apps
npm run db:push      # Push schema to database
npm run db:studio    # Open Drizzle Studio
npm run check        # Run linter
npm run fix          # Fix linting issues
```

## Testing

1. Navigate to http://localhost:3001/recorder
2. Click "Start Recording" and speak for 10-15 seconds
3. Click "Stop & Upload"
4. Verify chunks appear in MinIO under `sessions/<id>/chunks/`
5. Check database tables: `sessions`, `chunks`, `chunk_acks`

## License

MIT
