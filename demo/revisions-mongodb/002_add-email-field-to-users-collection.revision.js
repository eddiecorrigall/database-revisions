const { createUserModel } = require('./user-schema')

const previousVersion =
  '6f374fc7f25221ff9fafac6b1579a6ac5b99881675eb6d09992e35f1fe841361'

const up = async (client) => {
  const UserModel = createUserModel(client.connection)
  const users = await UserModel.find({
    email: { $exists: false }
  }).session(client.session)
  if (!users.length) {
    throw new Error('There should be users without emails')
  }
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    user.email = `${user.firstName}.${user.lastName}@my-company.com`
    await user.save(user)
  }
}

const down = async (client) => {
  const UserModel = createUserModel(client.connection)
  const users = await UserModel.find({
    email: { $exists: true }
  }).session(client.session)
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    user.email = undefined
    await user.save(user)
  }
}

module.exports = { previousVersion, up, down }
