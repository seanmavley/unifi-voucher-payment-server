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

router.get('/callback', function(req, res) {
  res.json({
    'state': true,
    'msg': 'Callback endpoint'
  })
})

router.post('/callback', function(req, res) {
  let new_transact = new Transact({
    trans_id: req.body.Data.TransactionId,
    resp: req.body
  });

  new_transact.save(function(err, transaction) {
    if(err) {
      console.log(err);
      res.json({
        'state': false,
        'error': err
      });
    }

    res.json({
      'state': true,
      'msg': transaction
    })
  });
});

router.get('/callback/get', function(req, res) {
  res.json({
    'state': true,
    'msg': 'Endpoint to poll for callbackUrl post status'
  })
});

// for polling
router.post('/callback/get', function(req, res) {

  if(!req.body.trans_id) {
    res.json({
      'state': false,
      'msg': 'No transaction id provided'
    })
  } else {

    Transact.findOne({
      trans_id: req.body.trans_id
    }, function(err, transaction) {

      if(err) {
        console.log(err);
        res.json({
          'state': false,
          'msg': err
        })
      }

      if(!transaction) {
        res.status(404).json({
          'state': false,
          'msg': 'No transaction found'
        })
      } else { // transaction found
        console.log(transaction);

        if (transaction.resp.ResponseCode === '2001') { // transaction was a failure
          res.status(400).json({
            'state': false,
            'msg': 'Transaction was a failure',
            'error': transaction
          })
        } else if (transaction.resp.ResponseCode === '0000') { // transaction succeeded
          // Check the .config_sample.js for sample
          let u = unifi({
            baseUrl: config.baseUrl, // The URL of the Unifi Controller
            username: config.username, // Your username
            password: config.password, // Your password
            // debug: true
          });

          let internet_megabytes;

          switch(req.body.package) {
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
              amount = 1000;
              console.log('Default to 5 cedis package if user is messing up with me');
          };

          // See https://github.com/delian/node-unifiapi#unifiapicreate_vouchercount-minutes-quota-note-up-down-mbytes-site--promise
          u.create_voucher(1, minutes_per_month, use_once, 'Generated via Mobile Money', undefined, undefined, internet_megabytes)
            .then((created) => {

              console.log('Success', created)
              // query the voucher then.
              console.log(created.data[0].create_time);
              u.stat_voucher(created.data[0].create_time)
                .then((response) => {

                  res.json({
                    'state': true,
                    'msg': 'Here you go, this is your voucher',
                    'data': response.data[0]
                  })
                
                })
                .catch((err) => {
                  console.log('Error', err);
                })
            })
            .catch((err) => {
              console.log('Error', err)
            })


        } else { // anything else means not good to proceed.
          res.json({
            'state': false,
            // Try to provide as many reasonable responses "ass" possible,
            // using the response codes from Hubtel
            'msg': 'Transaction could not complete. Please try again.',
            'error': transaction
          })

        }
      }
    })
  }
})

router.get('/buy', function(req, res) {
  res.json({
    'state': true,
    'msg': 'For buying voucher'
  })
});

router.post('/buy', function(req, res) {

  const client_ref = uuid();

  let amount;

  // this ensure user doesn't send in any tricks.
  switch(req.body.package) {
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
      amount = 5;
      console.log('Default to 5 cedis if user is messing up with me');
  };

  let options = {
    method: 'POST',
    uri: 'https://api.hubtel.com/v1/merchantaccount/merchants/' + config.account_id + '/receive/mobilemoney',
    headers: {
      'Authorization': 'Basic ' + config.api_auth
    },
    body: {
      "CustomerName": req.body.name,
      "CustomerMsisdn": req.body.number,
      "CustomerEmail": "",
      "Channel": req.body.network,
      "Amount": amount,
      "PrimaryCallbackUrl": config.callbackUrl,
      "SecondaryCallbackUrl": "",
      "Description": "Payment of AlwaysOn WiFi Package " + req.body.package,
      "ClientReference": client_ref
    },
    json: true
  }

  rp(options)
    .then(function(data) {

      if (data.ResponseCode === '0000') {
          // Check the .config_sample.js
        let u = unifi({
          baseUrl: config.baseUrl, // The URL of the Unifi Controller
          username: config.username, // Your username
          password: config.password, // Your password
          // debug: true
        });

        let internet_megabytes;

        switch(req.body.package) {
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
            amount = 1000;
            console.log('Default to 5 cedis package if user is messing up with me');
        };
        
        // See https://github.com/delian/node-unifiapi#unifiapicreate_vouchercount-minutes-quota-note-up-down-mbytes-site--promise
        u.create_voucher(1, minutes_per_month, use_once, 'Generated via Mobile Money', undefined, undefined, internet_megabytes)
          .then((created) => {

            console.log('Success', created)
            // query the voucher then.
            console.log(created.data[0].create_time);
            u.stat_voucher(created.data[0].create_time)
              .then((response) => {

                res.json({
                  'state': true,
                  'msg': 'Here you go, this is your voucher',
                  'data': response.data[0]
                })
              
              })
              .catch((err) => {
                console.log('Error', err);
              })
          })
          .catch((err) => {
            console.log('Error', err)
          })

      } else {
        // means 'pending'. Fa ho adwene. 
        res.json({
          'state': false,
          'msg': 'Confirm if purchase went through',
          'data': data
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

// router.get('/test/purchase', function(req, res) {
//   let u = unifi({
//     baseUrl: config.baseUrl, // The URL of the Unifi Controller
//     username: config.username, // Your username
//     password: config.password, // Your password
//     // debug: true
//   });

//   let internet_megabytes = 1000;

//   u.create_voucher(1, minutes_per_month, use_once, 'Generated via Mobile Money', undefined, undefined, internet_megabytes)
//     .then((created) => {

//       console.log('Success', created)
//       // query the voucher then.
//       console.log(created.data[0].create_time);
//       u.stat_voucher(created.data[0].create_time)
//         .then((response) => {

//           res.json({
//             'state': true,
//             'msg': 'Here you go, this is your voucher',
//             'data': response.data[0]
//           })
        
//         })
//         .catch((err) => {
//           console.log('Error', err);
//         })
//     })
//     .catch((err) => {
//       console.log('Error', err)
//     })
// })

module.exports = router;
