export const Loggings = {
  level: process.env.LOG_LEVEL || 'info',
  rotation: {
    prefixFileName: process.env.LOG_ROTATION_PREFIX || 'app',
    datePattern: process.env.LOG_ROTATION_DATE_PATTERN || 'YYYY-MM-DD',
    maxSize: process.env.LOG_ROTATION_MAX_SIZE || '20m',
    maxFiles: process.env.LOG_ROTATION_MAX_FILES || '14d',
  }
} as const
