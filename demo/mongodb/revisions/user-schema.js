const { Schema } = require('mongoose')

const UserSchema = new Schema({
  firstName: {
    type: Schema.Types.String,
    required: true
  },
  lastName: {
    type: Schema.Types.String,
    required: true
  },
  email: {
    type: Schema.Types.String,
    required: false
  }
})

let _model
const createUserModel = (connection) => {
  if (_model === undefined) {
    _model = connection.model('users', UserSchema)
  }
  return _model
}

module.exports = { UserSchema, createUserModel }
