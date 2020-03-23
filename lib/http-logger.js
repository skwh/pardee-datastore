'use strict';

module.exports = Logger

/**
 * Express middleware. Logs all requests and responses to console.
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
function Logger(req, res, next) {
  console.info(`${req.ip} -> ${req.protocol} - ${req.method} - ${req.originalUrl}`);
  res.on('finish', function() {
    console.info(`${req.ip} <- ${res.statusCode} ${res.statusMessage}`);
  });
  next();
}