import express from 'express';
import { validate } from './middlewares/validate.js';
import { reportSchema, dashboardQuerySchema } from './utils/validators.js';
import { catchAsync } from './middlewares/errorHandler.js';
import * as reportController from './controllers/report.controller.js';

const router = express.Router();

router.post('/report', validate(reportSchema, 'body'), catchAsync(reportController.createReport));
router.post('/reports/upload', reportController.uploadCSVHandler);
router.get('/job-status/:job_id', catchAsync(reportController.getJobStatus));
router.get('/dashboard', validate(dashboardQuerySchema, 'query'), catchAsync(reportController.getDashboard));

export default router;
