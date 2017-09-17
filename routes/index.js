let express = require('express');
let router = express.Router();
let rp = require('request-promise');
let config = require('../.config.js');
let uuid = require('uuid');


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
  res.json({
    'state': true,
    'msg': 'Response came back',
    'data': req.body
  })
});

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
      "Amount": req.body.amount,
      "PrimaryCallbackUrl": "http://webhook.site/8115e1cb-3f5e-4d2e-9b8d-975e917bd9e1",
      "SecondaryCallbackUrl": "",
      "Description": "Payment of AlwaysOn WiFi Package " + req.body.package,
      "ClientReference": client_ref
    },
    json: true
  }

  rp(options)
    .then(function(data) {
      console.log(data);

      if (data.ResponseCode === 0000) {
        res.json({
          'state': true,
          'stage': 0, // means 'done' or 'success'
          'msg': 'Confirms if purchase went through',
          'data': data
        })
      } else if(data.ResponseCode === 0001) {
        res.json({
          'state': true,
          'stage': 1, // means 'pending'
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
