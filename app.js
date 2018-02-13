let express = require('express');
let path = require('path');
let favicon = require('serve-favicon');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let mongoose = require('mongoose');
let config = require('./.config');
let helmet = require('helmet');
let Transact = require('./models/transactModel');
let User = require('./models/userModel');
let cors = require('cors');
let app = express();

mongoose.Promise = global.Promise; // so that we can use Promises with Mongoose

if (app.get('env') === 'test') {
  console.log('Using testDB');
  mongoose.connect(config.test, {
    useMongoClient: true
  });
} else {
  console.log('Using Dev/Prod DB');
  mongoose.connect(config.database, {
    useMongoClient: true
  });
}

app.use(cors({
  origin: ['http://locahost:4200', 'https://buy.enjoywifi.today']
}));

app.use(helmet());
// app.options(['api.enjoywifi.today', 'localhost'], cors());

let index = require('./routes/index');
// let auth = require('./routes/auth');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true,
}));
app.use(cookieParser());

// AUTHORIZATION HEADERS MIDDLEWARE
// capture and decode authorization headers if any,
// and pass decoded to next req
app.use(function (req, res, next) {
  if (req.header && req.headers.authorization && req.headers.authorization.split(' ')[0] === 'JWT') {
    jsonwebtoken.verify(req.headers.authorization.split(' ')[1], config.secret, function (err, decode) {
      if (err) req.user = undefined;
      req.user = decode;
      next();
    });
  } else {
    req.user = undefined;
    next();
  }
});

// at v1. Should make upgrades easier in future
// if new api version endpoints
const API_V1 = '/api/v1';

app.use(API_V1 + '/', index);
// app.use(API_V1 + '/auth', auth);
// authorization required for this entire endpoint

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  console.log(err);

  res.json({
    'status': err.status || 500,
    'msg': 'Not found or Server Error. See error code'
  });
});

module.exports = app;