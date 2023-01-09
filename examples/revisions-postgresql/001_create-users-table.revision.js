const up = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL
    )
  `);
  await client.query(`
    INSERT INTO users
      (first_name, last_name)
    VALUES
      ('Bob', 'Marley'),
      ('Alice', 'Cooper')
  `);
};

const down = async (client) => {
  await client.query(`
    DROP TABLE IF EXISTS users
  `);
};

module.exports = { up, down };
