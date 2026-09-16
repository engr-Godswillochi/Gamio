import pg from 'pg';

const passwords = [
  'postgres', 'admin', 'root', '123456', 'password', 'gamio',
  '1234', '12345', '12345678', 'sql', 'master', 'Postgres', 'PostgreSQL',
  'admin123', 'root123', 'HP', 'hp', 'secret', '123456789'
];

async function testConnections() {
  for (const pass of passwords) {
    const connectionString = `postgresql://postgres:${encodeURIComponent(pass)}@localhost:5432/postgres`;
    const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 1000 });
    try {
      const client = await pool.connect();
      console.log(`\n🎉 SUCCESS! Password for postgres on localhost is: '${pass}'`);
      client.release();
      await pool.end();
      return pass;
    } catch (err) {
      await pool.end();
    }
  }
  console.log('\nNo matching password found.');
  return null;
}

testConnections();
