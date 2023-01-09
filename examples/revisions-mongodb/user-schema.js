const { Schema } = require('mongoose');

const UserSchema = new Schema({
  firstName: {
    type: Schema.Types.String,
    required: true,
  },
  lastName: {
    type: Schema.Types.String,
    required: true,
  },
  email: {
    type: Schema.Types.String,
    required: false,
  },
});

const createUserModel = (connection) => {
  return connection.model('users', UserSchema);
};

module.exports = { UserSchema, createUserModel };
