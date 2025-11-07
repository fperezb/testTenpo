import {logger} from './logger.js';
import {Connector} from '@google-cloud/cloud-sql-connector';
import pg from 'pg';

const {Pool} = pg;

const connector = new Connector();
let pool;

export async function initDb() {
  if (pool) {
    return pool;
  }

  const instanceConnectionName = process.env.INSTANCE_CONNECTION_NAME;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;
  const dbName = process.env.DB_NAME;

  if (!instanceConnectionName || !dbUser || !dbPassword || !dbName) {
    throw new Error('Missing database environment variables');
  }

  const clientOpts = await connector.getOptions({
    instanceConnectionName,
    ipType: 'PRIVATE'
  });

  pool = new Pool({
    ...clientOpts,
    user: dbUser,
    password: dbPassword,
    database: dbName,
    max: parseInt(process.env.DB_POOL_MAX || '5', 10),
    statement_timeout: 5000
  });

  pool.on('error', (err) => {
    logger.error({err}, 'Unexpected PostgreSQL error');
  });

  logger.info('Database pool created');
  return pool;
}

export async function getCustomerByRut(rut) {
  const db = await initDb();
  const query = {
    text: 'SELECT first_name, last_name FROM customers WHERE rut = $1',
    values: [rut]
  };
  const result = await db.query(query);
  return result.rows[0] ?? null;
}

export async function insertCustomerEvent({rut, payload, requestId}) {
  const db = await initDb();
  const query = {
    text: `
      INSERT INTO customer_events (rut, payload, request_id, created_at)
      VALUES ($1, $2::jsonb, $3, NOW())
      RETURNING id
    `,
    values: [rut, JSON.stringify(payload), requestId]
  };
  const result = await db.query(query);
  return result.rows[0];
}

export async function upsertCustomer({rut, firstName, lastName}) {
  const db = await initDb();
  const query = {
    text: `
      INSERT INTO customers (rut, first_name, last_name)
      VALUES ($1, $2, $3)
      ON CONFLICT (rut)
      DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name
      RETURNING first_name, last_name
    `,
    values: [rut, firstName, lastName]
  };
  const result = await db.query(query);
  return result.rows[0];
}

export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = undefined;
    connector.close();
  }
}
