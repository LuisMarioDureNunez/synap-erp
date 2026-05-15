const { Pool } = require('pg');

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'synap_db',
  user: process.env.DB_USER || 'synap_admin',
  password: process.env.DB_PASSWORD || 'synap_secure_2025',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

class DatabaseConnection {
  static pool = null;

  static getInstance() {
    if (!DatabaseConnection.pool) {
      DatabaseConnection.pool = new Pool(poolConfig);
      DatabaseConnection.pool.on('error', (err) => {
        console.error('SYNAP DB ERROR:', err.message);
      });
    }
    return DatabaseConnection.pool;
  }

  static async query(text, params) {
    const pool = DatabaseConnection.getInstance();
    return await pool.query(text, params);
  }

  static async transaction(callback) {
    const pool = DatabaseConnection.getInstance();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default DatabaseConnection;
