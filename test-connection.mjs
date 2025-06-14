import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: "postgresql://postgres:postgres123@localhost:5432/imposte_forfettari"
});

async function test() {
  try {
    await client.connect();
    const res = await client.query('SELECT NOW()');
    console.log('✅ Connesso!', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('❌ Errore:', err.message);
  }
}

test();
