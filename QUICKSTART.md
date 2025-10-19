# Quick Start Guide

## Setup (One-time)

```bash
# Install dependencies
npm install

# Environment is already configured in .env
# MongoDB URI is already set
```

## Run the Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server will start on: **http://localhost:4000**

## Test the API

### 1. Health Check
```bash
curl http://localhost:4000/health
```

### 2. Create a Report
```bash
curl -X POST http://localhost:4000/report \
  -H "Content-Type: application/json" \
  -d '{
    "ngo_id": "NGO_001",
    "month": "2025-09",
    "people_helped": 120,
    "events_conducted": 5,
    "funds_utilized": 75000
  }'
```

### 3. Upload CSV File
```bash
# Use the included sample file
curl -X POST http://localhost:4000/reports/upload \
  -F "file=@sample_reports.csv"

# Response will include job_id
# Example: "job_id": "JOB_abc123..."
```

### 4. Check Job Status
```bash
# Replace JOB_ID with actual job_id from upload response
curl http://localhost:4000/job-status/JOB_ID
```

### 5. View Dashboard
```bash
curl "http://localhost:4000/dashboard?month=2025-09"
```

## Expected Results

After uploading `sample_reports.csv` (5 NGOs), the dashboard should show:

```json
{
  "status": "success",
  "data": {
    "month": "2025-09",
    "total_ngos_reporting": 5,
    "total_people_helped": 645,
    "total_events_conducted": 32,
    "total_funds_utilized": 334000
  }
}
```

## What's Included

- Full Express.js backend with MongoDB Atlas connection
- 4 API endpoints (report, upload, job-status, dashboard)
- Background CSV processing with job tracking
- Comprehensive validation and error handling
- Sample CSV file for testing
- Structured logging
- CORS enabled for frontend integration

## Next Steps

1. Your backend is now ready to integrate with the React frontend
2. Frontend should use `http://localhost:4000` as the API base URL
3. All endpoints return consistent JSON responses
4. CSV upload is async - poll job-status endpoint every 2 seconds

## API Endpoints Summary

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /health | Health check |
| POST | /report | Create/update single report |
| POST | /reports/upload | Upload CSV file |
| GET | /job-status/:id | Check upload progress |
| GET | /dashboard?month=YYYY-MM | Monthly statistics |

See **README.md** for complete API documentation.
