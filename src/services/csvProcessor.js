import fs from 'fs';
import csv from 'csv-parser';
import { logger } from '../utils/helpers.js';
import { csvRowSchema } from '../utils/validators.js';
import Job from '../models/job.model.js';
import Report from '../models/report.model.js';

// Required CSV columns - these must exist in uploaded file
const REQUIRED_COLUMNS = [
  'ngo_id',
  'month',
  'people_helped',
  'events_conducted',
  'funds_utilized',
];

// Check if CSV has all required columns
const validateHeaders = headers => {
  const missingColumns = REQUIRED_COLUMNS.filter(
    col => !headers.includes(col)
  );

  if (missingColumns.length > 0) {
    return {
      valid: false,
      error: `Missing required columns: ${missingColumns.join(', ')}`,
    };
  }

  return { valid: true };
};

// Convert date string to YYYY-MM format
const parseMonth = (monthStr) => {
  if (!monthStr) return null;

  const trimmed = monthStr.trim();

  // Already in YYYY-MM format
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Handle MM/DD/YYYY or M/D/YYYY format
  const dateMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dateMatch) {
    const month = dateMatch[1].padStart(2, '0');
    const year = dateMatch[3];
    return `${year}-${month}`;
  }

  // Handle "Oct 2025", "January 2025" format
  const monthNames = {
    jan: '01', january: '01',
    feb: '02', february: '02',
    mar: '03', march: '03',
    apr: '04', april: '04',
    may: '05',
    jun: '06', june: '06',
    jul: '07', july: '07',
    aug: '08', august: '08',
    sep: '09', sept: '09', september: '09',
    oct: '10', october: '10',
    nov: '11', november: '11',
    dec: '12', december: '12'
  };

  const textMonthMatch = trimmed.match(/^([a-z]+)\s+(\d{4})$/i);
  if (textMonthMatch) {
    const monthName = textMonthMatch[1].toLowerCase();
    const year = textMonthMatch[2];
    const monthNum = monthNames[monthName];
    if (monthNum) {
      return `${year}-${monthNum}`;
    }
  }

  // Return as-is if can't parse (will fail validation)
  return trimmed;
};

// Clean and convert CSV row data
const sanitizeRow = row => {
  return {
    ngo_id: row.ngo_id?.trim(),
    month: parseMonth(row.month),
    people_helped: parseInt(row.people_helped, 10),
    events_conducted: parseInt(row.events_conducted, 10),
    funds_utilized: parseInt(row.funds_utilized, 10),
  };
};

/**
 * Main CSV processing function - runs in background
 * Steps:
 * 1. Read and validate CSV file
 * 2. Check all rows are valid
 * 3. Save to database in batches
 * 4. Update job status throughout
 */
export const processCSV = async (filePath, job_id) => {
  logger.info('Starting CSV processing', { job_id });

  const rows = [];
  let headers = null;
  let isFirstRow = true;

  // Step 1: Read CSV file
  const stream = fs.createReadStream(filePath).pipe(csv());

  for await (const row of stream) {
    if (isFirstRow) {
      headers = Object.keys(row);
      isFirstRow = false;

      // Check if CSV has required columns
      const headerValidation = validateHeaders(headers);
      if (!headerValidation.valid) {
        await Job.updateOne({ job_id }, { status: 'failed', error_message: headerValidation.error });
        cleanupFile(filePath);
        return;
      }
    }

    rows.push(row);
  }

  // Update job with total row count
  await Job.updateOne({ job_id }, { status: 'processing', total: rows.length });

  // Step 2: Validate all rows
  const validatedRows = [];
  for (let i = 0; i < rows.length; i++) {
    const sanitized = sanitizeRow(rows[i]);
    const result = csvRowSchema.safeParse(sanitized);

    if (!result.success) {
      logger.error('Row validation failed', {
        row: i + 2,
        rawMonth: rows[i].month,
        sanitizedMonth: sanitized.month,
        sanitized,
        errors: result.error.issues
      });
      const errorMsg = `Row ${i + 2} validation failed: ${result.error.issues
        .map(e => `${e.path.join('.')} - ${e.message}`)
        .join(', ')}`;
      await Job.updateOne({ job_id }, { status: 'failed', error_message: errorMsg });
      cleanupFile(filePath);
      return;
    }

    validatedRows.push(result.data);
  }

  // Step 3: Save to database in batches (100 at a time)
  try {
    const batchSize = 100;
    let processed = 0;

    for (let i = 0; i < validatedRows.length; i += batchSize) {
      const batch = validatedRows.slice(i, i + batchSize);

      // Bulk upsert
      const bulkOps = batch.map(report => ({
        updateOne: {
          filter: { ngo_id: report.ngo_id, month: report.month },
          update: { $set: report },
          upsert: true,
        },
      }));
      await Report.bulkWrite(bulkOps, { ordered: false });

      processed += batch.length;
      await Job.updateOne({ job_id }, { processed });
    }

    // Done! Mark as success
    await Job.updateOne({ job_id }, { status: 'success' });
    logger.info('CSV processing completed', { job_id, total: rows.length });
  } catch (error) {
    logger.error('CSV processing failed', { job_id, error: error.message });
    await Job.updateOne({ job_id }, { status: 'failed', error_message: error.message });
  } finally {
    cleanupFile(filePath);
  }
};

// Delete temporary CSV file after processing
const cleanupFile = filePath => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      logger.info('Temp file deleted', { filePath });
    }
  } catch (error) {
    logger.error('File cleanup failed', { filePath, error: error.message });
  }
};
