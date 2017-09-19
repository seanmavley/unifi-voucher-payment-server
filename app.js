let express = require('express');
let path = require('path');
let favicon = require('serve-favicon');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let mongoose = require('mongoose');
let config = require('./.config');
let User = require('./models/transactModel');
let cors = require('cors');

let app = express();

app.use(cors());

mongoose.Promise = global.Promise; // so that we can use Promises with Mongoose

if (app.get('env') === 'test') {
    console.log('Using testDB')
    mongoose.connect(config.test, { useMongoClient: true });
} else {
    console.log('Using Dev/Prod DB');
    mongoose.connect(config.database, { useMongoClient: true });
}

let index = require('./routes/index');
// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  let err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500).json({
    'error': err.status
  });
});

module.exports = app;
