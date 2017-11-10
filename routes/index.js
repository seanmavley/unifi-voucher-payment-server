let express = require('express');
let router = express.Router();
let rp = require('request-promise');
let config = require('../.config.js');
let uuid = require('uuid');
let Transact = require('mongoose').model('Transact');
let unifi = require('node-unifiapi');

const minutes_per_month = 1440 * 30;
const use_once = 1;

router.get('/', function(req, res, next) {
  res.json({
    'state': true,
    'msg': 'Welcome to AlwaysOn WiFi Voucher Purchase API endpoint'
  })
});

router.get('/buy', function(req, res) {
  res.json({
    'state': true,
    'msg': 'For buying voucher'
  })
});

router.post('/buy', function(req, res) {
  let amount;
  let transaction_direction;

  // this ensures user doesn't send in any tricks.
  switch(req.body.package) {
    case '0.1gig':
      amount = 1;
      break;
    case '0.3gig':
      amount = 2;
      break;
    case '1gig':
      amount = 5;
      break;
    case '3gig':
      amount = 10;
      break;
    case '10gig':
      amount = 30;
      break;
    default:
      amount = 1;
      console.log('Default to 1 cedis if user is messing up with me');
  };
  
  // set transaction direction
  switch(req.body.network) {
    case 'mtn':
      transaction_direction = 'rmta'; // Receive Mtn To Airtel
      break;
    case 'tigo':
      transaction_direction = 'rtta';
      break;
    case 'airtel':
      transaction_direction = 'rata';
      break;
  }

  console.log(transaction_direction, amount, req.body.from_number, req.body.network);

  let options = {
    method: 'POST',
    uri: ' https://client.teamcyst.com/api_call.php',
    body: {
      "price": amount,
      "network": req.body.network,
      "recipient_number": config.receive_number,
      "sender": req.body.from_number,
      "option": transaction_direction,
      "apikey": config.api_key
    },
    json: true
  }

  rp(options)
    .then(function(data) {
      console.log(data);
      if (data && data.code === 1) {
        // Check the .config_sample.js
        let u = unifi({
          baseUrl: config.baseUrl, // The URL of the Unifi Controller
          username: config.username, // Your username
          password: config.password, // Your password
          // debug: true
        });

        let internet_megabytes;

        switch(req.body.package) {
          case '0.1gig':
            internet_megabytes = 100;
            break;
          case '0.3gig':
            internet_megabytes = 300;
            break;
          case '1gig':
            internet_megabytes = 1000;
            break;
          case '3gig':
            internet_megabytes = 3000;
            break;
          case '10gig':
            internet_megabytes = 10000;
            break;
          default:
            amount = 100;
            console.log('Default to 1 cedis package if user is messing up with me');
        };
        
        // See https://github.com/delian/node-unifiapi#unifiapicreate_vouchercount-minutes-quota-note-up-down-mbytes-site--promise
        u.create_voucher(1, minutes_per_month, use_once, 'Generated via Mobile Money', undefined, undefined, internet_megabytes)
          .then((created) => {

            console.log('Success', created)

            // query the voucher.
            console.log(created.data[0].create_time);
            u.stat_voucher(created.data[0].create_time)
              .then((response) => {

                // TODO: save something much meaningful and useful
                // to db.
                let transact = new Transact(options);
                transact.save((err, response) => {
                  if(err) console.log(err);
                  console.log(response);
                });

                res.json({
                  'state': true,
                  'msg': 'Here you go, this is your voucher',
                  'data': response.data[0]
                })
              
              })
              .catch((err) => {
                console.log('Error', err);
                res.json({
                  'state': false,
                  'msg': err
                })
              })
          })
          .catch((err) => {
            console.log('Error', err);
            res.json({
              'state': false,
              'msg': err
            })
          })
      } else {
        res.json({
          'state': false,
          'msg': 'Transaction failed. Contact support if this persist.',
        })
      }

    })
    .catch(function(err) {
      console.log(err);
      res.status(400).json({
        'state': false,
        'msg': err
      })
    })
})

module.exports = router;
