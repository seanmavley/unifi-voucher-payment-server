module.exports = {
  'api_key': 'get it from hubtel',
  'api_secret': 'get it from hubtel',
  'api_auth': new Buffer('api_key' + ':' + 'api_secret').toString('base64'),
  'callbackUrl': 'go here http://webhook.site',
  'account_id': 'get from hubtel',
  'database': 'mongodb://localhost/useyourown',
  'test': 'mongodb://localhost/useyourown',
  // Please, it is 2017, use HTTPS for your unifi controller
  // https://blog.khophi.co/use-letsencrypt-unifi-controller-ubuntu/
  'baseUrl': 'https://your-unifi-controller:8443', // The URL of the Unifi Controller
  'username': 'your-unifi-controller-username',
  'password': 'your-unifi-controller-password',
  // debug: true, // More debug of the API (uses the debug module)
  // debugNet: true // Debug of the network requests (uses request module)

  // Your ReCAPTCHA API credentials
  'sitekey': 'something-something',
  'sitesecret': 'duh-duh'
}
