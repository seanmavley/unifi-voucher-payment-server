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

  let captcha_token = req.body.captcha_token;

  const verification_option = {
    method: 'GET',
    uri: 'https://www.google.com/recaptcha/api/siteverify',
    qs: {
      secret: config.sitesecret,
      response: captcha_token
    },
    json: true
  };

  rp(verification_option)
    .then((response) => {

      if (response.success) {

        let amount;
        let transaction_direction;
        let network = req.body.network;
        let from_number = req.body.from_number;

        let network_prefix = ['024', '054', '055', '026', '056', '027', '057'];

        if (!network_prefix.includes(from_number.slice(0, 3))) {
          return res.json({
            'state': false,
            'msg': 'The phone number entered is NOT a valid Ghana Mobile Network phone number.'
          })
        }

        // this ensures user doesn't send in any tricks.
        switch (req.body.package) {
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
            amount = 2; // Default to 2 cedis if user is messing up with me
        };

        // set transaction direction
        switch (req.body.network) {
          case 'mtn':
            transaction_direction = 'rmta'; // Receive Mtn To Airtel
            break;
          case 'tigo':
            transaction_direction = 'rtta'; // Receive Tigo to Airtel
            break;
          case 'airtel':
            transaction_direction = 'rata'; // receive Airtel to aAirtel
            break;
        }

        // console.log(transaction_direction, amount, req.body.from_number, req.body.network);

        let options = {
          method: 'POST',
          uri: ' https://client.teamcyst.com/api_call.php',
          body: {
            "price": amount,
            "network": network,
            "recipient_number": config.receive_number,
            "sender": from_number,
            "option": transaction_direction,
            "apikey": config.api_key
          },
          json: true
        }

      rp(options)
        .then(function(api_response_data) {
          // console.log(api_response_data);

          options.response = api_response_data;

          if (api_response_data && api_response_data.code === 1) {
            // Check the .config_sample.js
            let u = unifi({
                baseUrl: config.baseUrl, // The URL of the Unifi Controller
                username: config.username, // Your username
                password: config.password, // Your password
                // debug: true
            });

            let internet_megabytes;

            switch (req.body.package) {
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
                amount = 300; // Default to 2 cedis package if user is messing up with me
            };

              // See https://github.com/delian/node-unifiapi#unifiapicreate_vouchercount-minutes-quota-note-up-down-mbytes-site--promise
            u.create_voucher(1, minutes_per_month, use_once, 'Generated via Mobile Money', undefined, undefined, internet_megabytes)
              .then((created) => {

                  // query the voucher.
                u.stat_voucher(created.data[0].create_time)
                  .then((response) => {

                    options.voucher = created.data[0];

                    Transact.create(options, (err, response) => {
                        if (err) console.log(err);
                        console.log(response);
                    });


                    res.json({
                        'state': true,
                        'msg': 'Here you go, this is your voucher',
                        'data': response.data[0],
                        'transaction': api_response_data
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

                options.response = api_response_data;

                Transact.create(options, (err, response) => {
                  if (err) console.log(err);
                  console.log(response);
                });

                res.json({
                  'state': false,
                  'msg': 'Transaction failed. User did not respond on time or declined the request. Contact support if you\'re sure this is a mistake.',
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

        } else {
          return res.json({
            'state': false,
            'msg': 'I hope you are a human. Take a look at this failure message: ' + response['error-codes']
          })
        }
    })
  .catch((err) => {
    return res.json({
      'state': false,
      'msg': 'I hope you are a human. Take a look at this failure message: ' + err
    })
  })

})

module.exports = router;