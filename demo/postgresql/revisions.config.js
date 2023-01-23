const path = require('path')

module.exports = {
  revisionsNamespace: 'demo',
  revisionsDirectory: path.resolve(__dirname, 'revisions'),
  connectionManagerModule: require('@database-revisions/postgresql'),
  stateManagerModule: require('@database-revisions/postgresql')
}
