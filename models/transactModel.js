let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let Transact = new Schema({
    slug: {
      type: String,
      unique: true,
      index: true
    },
    response: Object,
    voucher: Object,
    body: Object,
    json: Boolean,
});

module.exports = mongoose.model('Transact', Transact);