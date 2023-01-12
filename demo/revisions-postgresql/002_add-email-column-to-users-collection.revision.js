const previousVersion = '19874db117d515301a01b5225f174449b5f1f992'

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
