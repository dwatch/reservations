const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors, json } = format;

buildDevLogger = () => {
  const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} ${level}: ${stack || message}`;
  });
  return createLogger({
    format: combine(
      timestamp({format: 'YYYY-MM-DD HH:mm:ss'}), 
      errors({stack: true}), 
      logFormat
    ),
    transports: [new transports.Console()],
  });
}

buildProdLogger = () => {
  return createLogger({
    format: combine(
      timestamp(), 
      errors({stack: true}), 
      json()
    ),
    defaultMeta: { filename: '' },
    transports: [
      new transports.File({ filename: './logger/error.log', level: 'error' }),
      new transports.File({ filename: './logger/combined.log' }),
    ],
  });
}

let logger = (process.env.NODE_ENV === "development") ? buildDevLogger() : buildProdLogger()

module.exports = logger