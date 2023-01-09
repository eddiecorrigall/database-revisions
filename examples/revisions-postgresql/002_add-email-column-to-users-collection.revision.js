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

module.exports = { up, down }
