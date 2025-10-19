# NGO Monthly Reporting Backend API

A production-ready REST API backend for managing NGO monthly reports with CSV upload capabilities and real-time job tracking.

## Features

- Create/update individual NGO reports
- Bulk CSV upload with background processing
- Real-time job status tracking
- Monthly aggregated dashboard statistics
- MongoDB Atlas integration
- Comprehensive error handling
- Structured logging
- CORS-enabled for frontend integration

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4+
- **Database**: MongoDB Atlas (Mongoose ODM)
- **CSV Processing**: csv-parser
- **File Upload**: Multer
- **Validation**: Joi
- **Logging**: Morgan + Custom structured logger

## Prerequisites

- Node.js >= 18.0.0
- MongoDB Atlas account
- npm or yarn

## Installation

1. Clone the repository:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
PORT=4000
UPLOAD_DIR=./uploads
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
MAX_FILE_SIZE=5242880
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:4000`

## API Endpoints

### 1. Create/Update Single Report

**POST** `/report`

Create or update an NGO's monthly report (idempotent upsert).

**Request Body:**
```json
{
  "ngo_id": "NGO_001",
  "month": "2025-09",
  "people_helped": 120,
  "events_conducted": 5,
  "funds_utilized": 75000
}
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "Report saved.",
  "data": {
    "ngo_id": "NGO_001",
    "month": "2025-09",
    "people_helped": 120,
    "events_conducted": 5,
    "funds_utilized": 75000,
    "created_at": "2025-09-15T10:30:00.000Z",
    "updated_at": "2025-09-15T10:30:00.000Z"
  }
}
```

**Validation Rules:**
- `ngo_id`: Non-empty string
- `month`: YYYY-MM format
- `people_helped`, `events_conducted`, `funds_utilized`: Integer >= 0

**cURL Example:**
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

---

### 2. Upload CSV File

**POST** `/reports/upload`

Upload a CSV file for batch processing. Returns immediately with a job ID for tracking.

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- File type: `.csv`
- Max size: 5 MB

**CSV Format:**
```csv
ngo_id,month,people_helped,events_conducted,funds_utilized
NGO_001,2025-09,120,5,75000
NGO_002,2025-09,200,8,95000
NGO_003,2025-09,150,10,67000
```

**Success Response (200):**
```json
{
  "status": "success",
  "message": "File uploaded successfully. Processing started.",
  "data": {
    "job_id": "JOB_abc123-def456-789",
    "status": "pending"
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:4000/reports/upload \
  -F "file=@reports.csv"
```

**Postman Instructions:**
1. Set method to POST
2. URL: `http://localhost:4000/reports/upload`
3. Go to Body tab
4. Select `form-data`
5. Add key `file` (change type to File)
6. Choose your CSV file

---

### 3. Check Job Status

**GET** `/job-status/:job_id`

Poll this endpoint to track CSV processing progress.

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "job_id": "JOB_abc123-def456-789",
    "status": "processing",
    "processed": 20,
    "total": 50,
    "error_message": null
  }
}
```

**Job Statuses:**
- `pending`: Job created, not yet started
- `processing`: Currently processing rows
- `success`: Completed successfully
- `failed`: Failed with error message

**cURL Example:**
```bash
curl http://localhost:4000/job-status/JOB_abc123-def456-789
```

**Frontend Polling Pattern:**
```javascript
const pollJobStatus = async (jobId) => {
  const interval = setInterval(async () => {
    const response = await fetch(`http://localhost:4000/job-status/${jobId}`);
    const data = await response.json();

    if (data.data.status === 'success' || data.data.status === 'failed') {
      clearInterval(interval);
      console.log('Job completed:', data.data);
    } else {
      console.log(`Progress: ${data.data.processed}/${data.data.total}`);
    }
  }, 2000); // Poll every 2 seconds
};
```

---

### 4. Dashboard Statistics

**GET** `/dashboard?month=YYYY-MM`

Get aggregated statistics for a specific month.

**Query Parameters:**
- `month` (required): Month in YYYY-MM format

**Success Response (200):**
```json
{
  "status": "success",
  "data": {
    "month": "2025-09",
    "total_ngos_reporting": 3,
    "total_people_helped": 470,
    "total_events_conducted": 18,
    "total_funds_utilized": 237000
  }
}
```

**Empty Response (404):**
```json
{
  "status": "empty",
  "message": "No reports for this month"
}
```

**cURL Example:**
```bash
curl "http://localhost:4000/dashboard?month=2025-09"
```

---

### 5. Health Check

**GET** `/health`

Check if the server is running.

**Response (200):**
```json
{
  "status": "success",
  "message": "Server is running",
  "timestamp": "2025-09-15T10:30:00.000Z"
}
```

## Database Schema

### Collection: `reports`

```javascript
{
  _id: ObjectId,
  ngo_id: String,              // indexed
  month: String,               // indexed, format: YYYY-MM
  people_helped: Number,       // integer >= 0
  events_conducted: Number,    // integer >= 0
  funds_utilized: Number,      // integer >= 0
  created_at: Date,
  updated_at: Date
}
```

**Unique Compound Index:** `{ ngo_id: 1, month: 1 }`

### Collection: `jobs`

```javascript
{
  _id: ObjectId,
  job_id: String,              // unique, format: JOB_uuid
  status: String,              // enum: pending, processing, success, failed
  total: Number,               // total rows to process
  processed: Number,           // successfully processed rows
  error_message: String,       // null if no error
  created_at: Date
}
```

## Background Processing Design

The CSV upload process is designed to be non-blocking:

1. **Upload Phase**: File is saved via multer, job record created
2. **Immediate Response**: Return job_id to client immediately
3. **Background Processing**:
   - Runs asynchronously using `setImmediate()`
   - Streams CSV file line-by-line (memory efficient)
   - Validates headers and all rows before insertion
   - Batch inserts in chunks of 100 rows
   - Updates job progress after each batch
   - Deletes temporary file when complete/failed

**Key Benefits:**
- Non-blocking: Server can handle other requests during processing
- Memory efficient: Streams large files instead of loading into memory
- Persistent tracking: Job status survives server restarts (stored in DB)
- Idempotent: Duplicate NGO+month combinations are safely overwritten

## Error Handling

All errors return consistent JSON format:

```json
{
  "status": "error",
  "message": "Error description",
  "errors": ["Detailed error 1", "Detailed error 2"]
}
```

**Common Error Codes:**
- `400`: Validation error, bad request
- `404`: Resource not found
- `409`: Duplicate key conflict
- `500`: Internal server error

## Project Structure

```
backend/
├── src/
│   ├── app.js                    # Express app entry point
│   ├── config/
│   │   └── db.js                 # MongoDB connection
│   ├── models/
│   │   ├── report.model.js       # Report schema
│   │   └── job.model.js          # Job schema
│   ├── routes/
│   │   ├── report.routes.js      # POST /report
│   │   ├── upload.routes.js      # POST /reports/upload
│   │   ├── job.routes.js         # GET /job-status/:id
│   │   └── dashboard.routes.js   # GET /dashboard
│   ├── services/
│   │   ├── report.service.js     # Report business logic
│   │   ├── job.service.js        # Job management
│   │   └── csvProcessor.js       # Background CSV worker
│   ├── middlewares/
│   │   ├── errorHandler.js       # Global error handling
│   │   └── validate.js           # Request validation
│   └── utils/
│       ├── logger.js             # Structured logging
│       ├── uuid.js               # Job ID generation
│       └── validators.js         # Joi schemas
├── uploads/                      # Temporary CSV files
├── .env                          # Environment variables
├── .env.example                  # Environment template
├── package.json
└── README.md
```

## Development

### Code Formatting
```bash
npm run format
```

### Linting
```bash
npm run lint
```

## Troubleshooting

### MongoDB Connection Failed
- Verify `MONGODB_URI` in `.env` is correct
- Check if your IP is whitelisted in MongoDB Atlas
- Ensure network connectivity

### File Upload Errors
- Check if `UPLOAD_DIR` exists and has write permissions
- Verify file size is under 5MB
- Ensure file is valid CSV format

### Job Stuck in Processing
- Check server logs for errors
- Verify MongoDB connection is active
- Check if temporary file exists in `uploads/`

### CORS Issues
- Update `FRONTEND_URL` in `.env` to match your frontend
- Check browser console for specific CORS error

## Testing with Sample Data

Create a sample CSV file `sample_reports.csv`:
```csv
ngo_id,month,people_helped,events_conducted,funds_utilized
NGO_001,2025-09,120,5,75000
NGO_002,2025-09,200,8,95000
NGO_003,2025-09,150,10,67000
```

Upload and track:
```bash
# Upload
curl -X POST http://localhost:4000/reports/upload \
  -F "file=@sample_reports.csv"

# Response: { "job_id": "JOB_xyz..." }

# Track status
curl http://localhost:4000/job-status/JOB_xyz...

# View dashboard
curl "http://localhost:4000/dashboard?month=2025-09"
```

## Security Considerations

- Environment variables are used for sensitive data
- File size limits prevent DoS attacks
- CSV fields are sanitized before insertion
- CORS configured for specific frontend origin
- MongoDB URI not exposed in API responses
- All routes protected with error handling

## License

MIT

## Support

For issues and questions, please contact the development team or create an issue in the repository.
