import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Report from '../models/report.model.js';
import Job from '../models/job.model.js';
import { processCSV } from '../services/csvProcessor.js';
import { generateJobId } from '../utils/helpers.js';

// Multer setup
const uploadDir = process.env.UPLOAD_DIR || './uploads';
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, _file, cb) => cb(null, `upload-${Date.now()}.csv`),
  }),
  fileFilter: (_req, file, cb) => {
    path.extname(file.originalname).toLowerCase() === '.csv'
      ? cb(null, true)
      : cb(new Error('Only CSV files allowed'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// POST /report
export const createReport = async (req, res) => {
  const { ngo_id, month } = req.body;
  const report = await Report.findOneAndUpdate({ ngo_id, month }, req.body, { new: true, upsert: true });
  res.json({ status: 'success', message: 'Report saved.', data: report });
};

// POST /reports/upload (multer middleware + handler)
const uploadMiddleware = upload.single('file');

export const uploadCSVHandler = async (req, res) => {
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ status: 'error', message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No file uploaded' });
    }

    const job_id = generateJobId();
    await Job.create({ job_id, status: 'pending' });

    setImmediate(() => processCSV(req.file.path, job_id).catch(console.error));

    res.json({
      status: 'success',
      message: 'File uploaded successfully. Processing started.',
      data: { job_id, status: 'pending' },
    });
  });
};

// GET /job-status/:job_id - Check job status
export const getJobStatus = async (req, res) => {
  const job = await Job.findOne({ job_id: req.params.job_id }).select(
    '-_id -__v'
  );

  if (!job) {
    return res.status(404).json({
      status: 'error',
      message: 'Job not found',
    });
  }

  res.json({
    status: 'success',
    data: job,
  });
};

// GET /dashboard?month=YYYY-MM - Get monthly stats
export const getDashboard = async (req, res) => {
  const { month } = req.query;

  const result = await Report.aggregate([
    { $match: { month } },
    {
      $group: {
        _id: null,
        ngos: { $addToSet: '$ngo_id' },
        total_people_helped: { $sum: '$people_helped' },
        total_events_conducted: { $sum: '$events_conducted' },
        total_funds_utilized: { $sum: '$funds_utilized' },
      },
    },
    {
      $project: {
        _id: 0,
        total_ngos_reporting: { $size: '$ngos' },
        total_people_helped: 1,
        total_events_conducted: 1,
        total_funds_utilized: 1,
      },
    },
  ]);

  if (result.length === 0) {
    return res.json({
      status: 'success',
      message: 'No reports available for this month yet',
      data: {
        month,
        total_ngos_reporting: 0,
        total_people_helped: 0,
        total_events_conducted: 0,
        total_funds_utilized: 0,
      },
    });
  }

  res.json({
    status: 'success',
    data: { month, ...result[0] },
  });
};
