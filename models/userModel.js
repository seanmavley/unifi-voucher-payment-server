let mongoose = require('mongoose');
let bcrypt = require('bcrypt');
let Schema = mongoose.Schema;

let UserSchema = new Schema({
  username: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    required: true,
    minlength: 3
  },
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    required: true
  },
  hash_password: {
    type: String,
    required: true,
  },
  reset_password_token: {
    type: String
  },
  reset_password_expires: {
    type: Date,
  },
  created: {
    type: Date,
    default: Date.now
  },
  last_login: {
    type:Date
  },
  email_verified: {
    type: Boolean,
    default: false
  },
  verification_token: {
    type: String
  },
  verification_token_expires: {
    type: Date
  },
  is_active: {
    type: Boolean,
    default: true
  }
});

UserSchema.methods.comparePassword = function(password) {
  return bcrypt.compareSync(password, this.hash_password);
};

module.exports = mongoose.model('User', UserSchema);