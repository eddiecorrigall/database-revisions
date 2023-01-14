const { createUserModel } = require('./user-schema')

const previousVersion = '3a8a0712993682c3dd74f6784c58e02e9e372792'

const up = async (client) => {
  const UserModel = createUserModel(client.connection)
  const users = await UserModel.find({
    email: { $exists: false }
  }).session(client.session)
  if (!users.length) {
    throw new Error('expected users to have no email')
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
