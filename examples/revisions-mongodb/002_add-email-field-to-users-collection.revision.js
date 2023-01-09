const { createUserModel } = require('./user-schema')

const up = async (client) => {
  const UserModel = createUserModel(client.connection)
  const users = await UserModel.find({ email: { $exists: false } }).session(client.session)
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
  const users = await UserModel.find({ email: { $exists: true } }).session(client.session)
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    user.email = undefined
    await user.save(user)
  }
}

module.exports = { up, down }
