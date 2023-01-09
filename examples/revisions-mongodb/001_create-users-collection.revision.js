const { createUserModel } = require('./user-schema')

const up = async (client) => {
  const UserModel = createUserModel(client.connection)
  await UserModel.create([
    {
      firstName: 'Bob',
      lastName: 'Marley'
    },
    {
      firstName: 'Alice',
      lastName: 'Cooper'
    }
  ], { session: client.session })
}

const down = async (client) => {
  const UserModel = createUserModel(client.connection)
  await UserModel.deleteMany({}).session(client.session)
}

module.exports = { up, down }
