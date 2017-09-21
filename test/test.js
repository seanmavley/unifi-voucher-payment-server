process.env.NODE_ENV = 'test';

let mongoose = require('mongoose');
let User = require('../models/transactModel.js');

let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../bin/www');
let should = chai.should();
let expect = chai.expect;

chai.use(chaiHttp);

let initiate_transaction = {
    "CustomerName": "Customer FullName",
    "CustomerMsisdn": "0271588079",
    "CustomerEmail": "",
    "Channel": "tigo-gh",
    "Amount": 1.0,
    "PrimaryCallbackUrl": "http://localhost:3012/callback",
    "SecondaryCallbackUrl": "",
    "Description": "Testing",
    "ClientReference": ""
}

let pending_response = {
    "ResponseCode": "0001",
    "Data": {
        "AmountAfterCharges": 0.0,
        "TransactionId": "70fff62b7d98477bbf74d3e2b24bf405",
        "ClientReference": "",
        "Description": "Transaction failed due to an error with the upstream provider. Please check and try again.",
        "ExternalTransactionId": "15E91E955A918273",
        "Amount": 1.0,
        "Charges": 0.0
    }
};

let transaction_failed = {
    "ResponseCode": "2001",
    "Data": {
        "AmountAfterCharges": 0,
        "TransactionId": "70fff62b7d98477bbf74d3e2b24bf405",
        "ClientReference": "",
        "Description": "Transaction failed due to an error with the upstream provider. Please check and try again.",
        "ExternalTransactionId": "15E91E955A918273",
        "Amount": 1,
        "Charges": 0
    }
}

let transaction_success = {
    "ResponseCode": "0000",
    "Data": {
        "AmountAfterCharges": 0,
        "TransactionId": "70fff62b7d98477bbf74d3e2b24bf405",
        "ClientReference": "",
        "Description": "Transaction_success",
        "ExternalTransactionId": "15E91E955A918273",
        "Amount": 1,
        "Charges": 0
    }
}


/**
 * Buy something
 */

describe('Initiate a Mobile Money Transaction', () => {

    describe('/GET buy', () => {
        it('it should display login page', (done) => {
            chai.request(server)
                .get('/buy')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.have.property('msg')
                    done();
                })
        })
    });

    // describe('/POST buy', () => {
    //   it('it should initiate transaction')
    // })

    /**
    The fact that I can't have a Sandbox version of Hubtel's API to even write 
    tests for an application is very crazy.
    */
})