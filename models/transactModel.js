let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let Transact = new Schema({
    trans_id: {
      type: String,
      unique: true
    },
    resp: Object
});

module.exports = mongoose.model('Transact', Transact);