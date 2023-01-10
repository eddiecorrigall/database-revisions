const previousVersion =
  '5d9f7404de8ae177d0f60f4bfc06684debb0fae243884c3cbbbbbea96b97ac65'

const up = async (client) => {
  await client.query(`
    ALTER TABLE users ADD COLUMN email TEXT
  `)
  await client.query(`
    UPDATE users
    SET email = first_name || '.' || last_name || '@my-company.com'
  `)
}

const down = async (client) => {
  await client.query(`
    ALTER TABLE users DROP COLUMN email
  `)
}

module.exports = { previousVersion, up, down }
