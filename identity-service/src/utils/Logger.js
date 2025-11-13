const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format : winston.format.combine(
        winston.format.timestamp(),
        winston.format.splat(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'identity-service' },   
    transports: [
        new winston.transports.Console({
            format: winston.format.combine([
                winston.format.colorize(),
                winston.format.simple()
            ])
        })
    ]
})