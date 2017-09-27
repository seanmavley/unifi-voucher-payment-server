# Unifi Voucher Payment Server

A typical use case of the Hubtel API in making mobile money payments. 

To see this repository in action, visit [Enjoy WiFi, Today]('https://enjoywifi.today') and follow the "Buy Bundle" link.

This repository is complementary to the @seanmavley/unifi-voucher-payment-frontend repository. They both work in tandem to accept Mobile Money payments from Airtel, Tigo and MTN networks in Ghana, responding with a generated voucher code in the end.

See the @seanmavley/unifi-voucher-payment-frontend for more details of the outworkings of the Frontend.

## Credits 

 - Hubtel's Mobile Money Payments API (HTTP) is in use for the mobile payments. 
 - Node-UnifiAPI ( @delian/node-unifiapi ) handles the generation of voucher codes, in connection with our self-managed Unifi Controller for AlwaysOn WiFi.
 - And many other packages

## How it works

 - API forwards a request to Hubtel's API after verifying details from frontend
 - API then forwards the response, either success or failed to frontend for processing
 - If need be, Frontend polls a callback endpoint for updates. If found, proceeds to generate voucher and sends to frontend.
 
## Run Locally

 - Git clone this repository
 - Run `npm install` in project root
 - `gulp start` to view application to kickstart API server.
 - At this point, you see errors, therefore, create a `.config.js` file following what's shown in the `.config_sample.js`
 - Gulp should restart server after changes. If not, you know what to do.

 
## Contributing

PR and Issues are welcome to open. Will appreciate any hints on how to improve the implementation.

## Tests
Not yet.
 
# License

See LICENSE
