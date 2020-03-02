'use strict';

module.exports = Logger

function Logger(req, res, next) {
  console.log(`${req.ip} -> ${req.protocol} - ${req.method} - ${req.originalUrl}`);
  res.on('finish', function() {
    console.log(`${req.ip} <- ${res.statusCode} ${res.statusMessage}`);
  });
  next();
}