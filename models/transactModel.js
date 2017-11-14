let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let Transact = new Schema({
    response: Object,
    voucher: Object,
    // method: String,
    // uri: String,
    body: Object,
    json: Boolean,
});

module.exports = mongoose.model('Transact', Transact);