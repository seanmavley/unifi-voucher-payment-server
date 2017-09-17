module.exports = {
  'api_key': 'get it from hubtel',
  'api_secret': 'get it from hubtel',
  'api_auth': new Buffer('api_key' + ':' + 'api_secret').toString('base64'),
  'callbackUrl': 'go here http://webhook.site',
  'account_id': 'get from hubtel',
  'database': 'mongodb://localhost/useyourown',
  'test': 'mongodb://localhost/useyourown',
}
