let express = require('express');
let router = express.Router();
let rp = require('request-promise');
let config = require('../.config.js');
let uuid = require('uuid');
let Transact = require('mongoose').model('Transact');

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
  console.log(req.body);
  let new_transact = new Transact({
    trans_id: req.body.Data.TransactionId,
    resp: req.body
  });

  new_transact.save(function(err, transaction) {
    // just log to console
    if(err) {
      console.log(err);
      res.json({
        'state': false,
        'error': err
      });
    }

    // console.log(transaction);

    res.json({
      'state': true,
      'msg': transaction
    })
  });
});

// This queries the Transact to see if 
// the callback was called.
router.post('/callback/get', function(req, res) {
  // is transact_id provided
  if(!req.body.trans_id) {
    res.json({
      'state': false,
      'msg': 'No transaction id provided'
    })
  } else {
    // query
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

      // no transaction found
      if(!transaction) {
        res.json({
          'state': false,
          'msg': 'No transaction found'
        })
      } else {
        console.log(transaction);

        if (transaction.resp.ResponseCode === '2001') { // transaction was a failure
          res.json({
            'state': false,
            'msg': 'Transaction was a failure'
          })
        } else if (transaction.resp.ResponseCode === '0000') { // transaction succeeded

          // eventually this section will generate the Voucher,
          // and send to the client to display.
          res.json({
            'state': true,
            'msg': 'Here is your generated voucher'
          })

        } else { // anything else means not good to proceed.

          res.json({
            'state': false,
            // Try to provide as many reasonable responses "ass" possible,
            // using the response codes from Hubtel
            'msg': 'Transaction could not complete. Please try again.'
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
  console.log(req.body);

  console.log(config.api_auth);

  const client_ref = uuid();

  let amount;

  // Shall we check the packages
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
      console.log(data);

      if (data.ResponseCode === '0000') {
        // this eventually should generate code and send.
        res.json({
          'state': true,
          'msg': 'Here you go, this is your voucher',
          'data': data
        })
      } else if(data.ResponseCode === '0001') {
        // means 'pending'. Fa ho adwene. 
        // Initiate interval observable to poll callback endpoint
        // Here's the most annoying part.
        res.json({
          'state': true,
          'stage': true,
          'msg': 'Confirm if purchase went through',
          'data': data
        })
      } else {
        res.json({
          'state': false,
          'msg': 'Something did not go as planned. See error message',
          'error': data
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
