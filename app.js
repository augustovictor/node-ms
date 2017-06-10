const express = require('express');
const morgan  = require('morgan');
const http    = require('http');
const mongo   = require('mongodb');
const winston = require('winston');

// Logging
winston.emitErrs = true;

var logger = new winston.Logger({
    transports: [
        new winston.transports.Console({
            timestamp: true,
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ],
    exitOnError: false
});

logger.stream = {
    write: (message, encoding) => {
        logger.debug(message.replace(/\n$/g, ''));
    }
};

// Express and middlewares
const app = express();
app.use(
    // Log requests
    morgan(':method :url :status :response-time ms - :res[content-length]', {
        stream: logger.stream
    })
);

let db;
if(process.env.MONGO_URL) {
    mongo.connect(process.env.MONGO_URL, null, (err, db_) => {
        if(err) { logger.error(err); }
        else { db = db_; }
    });
};

app.use((req, res, next) => {
    if(!db) {
        // Database not connected
        mongo.connect(process.env.MONGO_URL, null, (err, db_) => {
            if(err) { 
                logger.error(err);
                res.sendStatus(500);
            } else {
                db = db_;
                next();
            }
        });
    } else {
        next();
    }
});

// Queries
app.get('/tickets', (req, res, next) => {
    const collection = db.collection('tickets');
    collection.find().toArray((err, result) => {
        if(err) {
            logger.error(err);
            res.sendStatus(500);
            return;
        }
        res.json(result);
    });
});

// Server setup
const port = process.env.PORT || 3000;
http.createServer(app).listen(port, (err) => {
    if(err) {
        logger.error(err);
    } else {
        logger.info(`Listening on http://localhost:${port}`);
    }
});