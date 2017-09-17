let mongoose = require('mongoose');
let Schema = mongoose.Schema;

let Transact = new Schema({
  fullName: {
    type: String,
    trim: true,
    required: true,
    minlength: 5
  }
});

module.exports = mongoose.model('Transact', Transact);