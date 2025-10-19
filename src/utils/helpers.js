import { v4 as uuidv4 } from 'uuid';

// Generate unique job ID
export const generateJobId = () => `JOB_${uuidv4()}`;

// Simple logger
export const logger = {
  info(message, data = {}) {
    console.log(JSON.stringify({ time: new Date().toISOString(), level: 'INFO', message, ...data }));
  },
  error(message, data = {}) {
    console.error(JSON.stringify({ time: new Date().toISOString(), level: 'ERROR', message, ...data }));
  },
  warn(message, data = {}) {
    console.warn(JSON.stringify({ time: new Date().toISOString(), level: 'WARN', message, ...data }));
  },
};
