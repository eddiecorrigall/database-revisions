#!/usr/bin/env node

// Used to run CLI, for example try `npx . help`

const path = require('path')
const { main } = require('../package.json')

require(path.resolve(__dirname, '..', main))
