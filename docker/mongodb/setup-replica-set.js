const config = {
  _id: 'mongodb-replica-set',
  version: 1,
  members: [
    {
      _id: 0,
      host: '127.0.0.1:27017'
    }
  ]
}

// eslint-disable-next-line no-undef
rs.initiate(config)

// eslint-disable-next-line no-undef
rs.status()
