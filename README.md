# Fault-Tolerant Data Processing System

A full-stack event processing and analytics system designed to reliably ingest, normalize, deduplicate, persist, and analyze incoming data events.

The system demonstrates fault-tolerant event processing through duplicate detection, fingerprint-based idempotency, simulated database failures, failed-event logging, recovery, and analytics filtering.

## Features

- Event ingestion through REST API
- JSON event validation
- Event normalization
- Deterministic event fingerprint generation
- Duplicate event detection
- Idempotent event processing
- SQLite database persistence
- Prisma ORM
- Simulated database failure handling
- Failed event logging
- Event recovery after failure
- Analytics and aggregation
- Client-based analytics filtering
- Date-range analytics filtering
- Combined client and date filtering
- Interactive frontend dashboard
- System health indicator
- Dashboard refresh
- Processed event history
- Failed event history
- Production frontend build

## Architecture

```text
                 ┌─────────────────────┐
                 │      Frontend       │
                 │   React + Vite      │
                 │                     │
                 │ Dashboard           │
                 │ Event Submission    │
                 │ Filters             │
                 │ Analytics           │
                 └──────────┬──────────┘
                            │
                            │ HTTP / REST API
                            ▼
                 ┌─────────────────────┐
                 │       Backend       │
                 │  Node.js + Express  │
                 │                     │
                 │ Validation          │
                 │ Normalization       │
                 │ Fingerprinting      │
                 │ Deduplication       │
                 │ Failure Handling    │
                 │ Analytics           │
                 └──────────┬──────────┘
                            │
                            │ Prisma ORM
                            ▼
                 ┌─────────────────────┐
                 │       SQLite        │
                 │                     │
                 │ Events              │
                 │ Failed Events       │
                 └─────────────────────┘

Technology Stack
Frontend
React
Vite
Tailwind CSS
Backend
Node.js
Express.js
CORS
Database
SQLite
ORM
Prisma
Development Tools
Git
GitHub
PowerShell
npm
Project Structure
fault-tolerant-system/
│
├── backend/
│   ├── lib/
│   │   └── prisma.js
│   │
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   │
│   ├── services/
│   │   ├── fingerprint.js
│   │   └── normalizer.js
│   │
│   ├── generated/
│   │   └── prisma/
│   │
│   ├── server.js
│   ├── package.json
│   └── prisma7.config.ts
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   └── style.css
│   │
│   ├── public/
│   ├── index.html
│   └── package.json
│
├── .gitignore
└── README.md

Getting Started
Prerequisites

Make sure the following are installed:

Node.js
npm
Git

Verify the installations:

node --version
npm --version
git --version
Backend Setup

Open a terminal and navigate to the backend:
cd backend

Install dependencies:

npm install

Run database migrations:

npx prisma migrate dev --name init

Generate the Prisma client if required:

npx prisma generate
Start the backend:

node server.js

The backend will run at:

http://localhost:5000

You should see:

Server running on http://localhost:5000

Frontend Setup

Open another terminal:

cd frontend

Install dependencies:

npm install

Start the Vite development server:

npm run dev

The frontend will be available at:

http://localhost:5173
API Endpoints
Health Check
GET /

Checks whether the backend API is running.

Example:

curl http://localhost:5000/

Response:

{
  "message": "Fault-Tolerant Data Processing API is running"
}
Process Event
POST /api/events

Processes a new event.

Example request:

{
  "source": "client_A",
  "payload": {
    "metric": "sales",
    "amount": "1200",
    "timestamp": "2024/01/01"
  }
}

Successful response:

{
  "success": true,
  "duplicate": false,
  "message": "Event processed successfully",
  "data": {
    "id": 1,
    "clientId": "client_A",
    "metric": "sales",
    "amount": 1200,
    "status": "processed"
  }
}
Duplicate Event

Submitting the same event again generates the same fingerprint.

The system detects the existing event and does not create another database record.

Example response:

{
  "success": true,
  "duplicate": true,
  "message": "Duplicate event ignored"
}

This provides idempotent event processing.

Simulate Failure

The API supports simulated database failures for testing fault handling.

Example:

{
  "source": "client_TEST",
  "simulateFailure": true,
  "payload": {
    "metric": "test",
    "amount": "1000",
    "timestamp": "2024/01/07"
  }
}

Response:

{
  "success": false,
  "simulatedFailure": true,
  "message": "Simulated database failure"
}

The failed event is recorded in the FailedEvent database table.

Get Events
GET /api/events

Returns processed events and failed events.

Example:

curl http://localhost:5000/api/events

Response structure:

{
  "success": true,
  "events": [],
  "failedEvents": []
}
Analytics API
Get All Analytics
GET /api/analytics

Returns aggregated event statistics.

Example:

GET /api/analytics

Example response:

{
  "success": true,
  "filters": {
    "client": "",
    "from": "",
    "to": ""
  },
  "totalEvents": 5,
  "totalAmount": 22200,
  "byClient": [
    {
      "client": "client_A",
      "count": 1,
      "totalAmount": 1200
    }
  ]
}
Filter by Client
GET /api/analytics?client=client_C

Example result:

{
  "success": true,
  "filters": {
    "client": "client_C",
    "from": "",
    "to": ""
  },
  "totalEvents": 2,
  "totalAmount": 11000
}
Filter by Date
GET /api/analytics?from=2024-01-03&to=2024-01-04

The date range is inclusive.

For example:

2024-01-03 → 2024-01-04

includes events occurring on both dates.

Combined Filters

Client and date filters can be used together:

GET /api/analytics?client=client_C&from=2024-01-03&to=2024-01-04
Event Processing Flow

The event processing pipeline works as follows:

Incoming Event
      │
      ▼
Validate JSON
      │
      ▼
Normalize Event
      │
      ▼
Generate Fingerprint
      │
      ▼
Check Existing Fingerprint
      │
      ├───────────────┐
      │               │
      ▼               ▼
 Existing          New Event
 Event                 │
      │                ▼
      ▼          Check Failure
 Return Duplicate      │
 Response         ┌────┴────┐
                   │         │
                   ▼         ▼
                Failure    Success
                   │         │
                   ▼         ▼
             FailedEvent   Event
               Record     Database
Fault Tolerance

The system demonstrates fault tolerance through several mechanisms.

1. Duplicate Detection

Each normalized event is converted into a deterministic fingerprint.

The fingerprint is used to identify events that have already been processed.

This prevents duplicate database records when the same event is submitted multiple times.

2. Failure Recording

When database failure simulation is enabled, the event is not silently discarded.

Instead, the system records:

Client ID
Failure reason
Original raw payload
Timestamp

in the failed-event table.

3. Recovery

After a simulated failure, the system can process a new event successfully when the failure condition is removed.

This demonstrates the recovery flow:

Event
  ↓
Failure
  ↓
Failed Event Recorded
  ↓
Retry / Recovery
  ↓
Successful Processing
Frontend Dashboard

The dashboard provides:

Statistics
Total Events
Total Amount
Processed Events
Failed Attempts
Analytics Filters
Client
From Date
To Date
Event Submission

Users can submit raw JSON events directly from the dashboard.

Failure Simulation

A checkbox allows database failure behavior to be demonstrated without manually calling the API.

Event History

The dashboard displays:

Successfully processed events
Failed/rejected events
System Status

The header displays the current API connectivity state:

● System Online

The dashboard also provides a refresh button for retrieving the latest data.

Testing

The system was tested using the following scenarios:

Test	Expected Result	Status
New event	Event stored	✅
Duplicate event	Duplicate ignored	✅
Simulated failure	Failure recorded	✅
Recovery	Event processed successfully	✅
Analytics	Correct aggregation	✅
Client filter	Correct client results	✅
Date filter	Correct date results	✅
Combined filters	Correct filtered results	✅
Dashboard refresh	Latest data displayed	✅
Frontend production build	Build succeeds	✅
Backend health check	API responds	✅
Production Build

The frontend has been verified with:

npm run build

The production build generates the dist directory.

Example:

dist/
├── index.html
└── assets/
Database

The application uses SQLite for local persistence.

Prisma manages the database schema and migrations.

Main entities include:

Event
FailedEvent

The Event entity stores successfully processed events.

The FailedEvent entity stores events that could not be processed because of simulated or processing failures.

GitHub

Repository:

https://github.com/kkm1999/fault-tolerant-system

Future Improvements


The Fault-Tolerant Data Processing System demonstrates a complete event-processing workflow with reliable ingestion, normalization, fingerprint-based duplicate detection, database persistence, failure handling, recovery, analytics, and a web-based dashboard.

The project combines a React/Vite frontend with a Node.js/Express backend, Prisma ORM, and SQLite database to provide an end-to-end fault-tolerant data processing solution.



