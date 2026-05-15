// ============================================
// SYNAP - CONFIGURACION DE BASE DE DATOS
// AUTOR: LUIS MARIO DURE NUNEZ "LMTN"
// ============================================

import { Pool, PoolConfig } from 'pg';

const poolConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'synap_db',
  user: process.env.DB_USER || 'synap_admin',
  password: process.env.DB_PASSWORD || 'synap_secure_2025',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};

class DatabaseConnection {
  private static instance: Pool;
  private static reconnectAttempts: number = 0;
  private static maxReconnectAttempts: number = 10;
  private static reconnectDelay: number = 5000;

  static getInstance(): Pool {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new Pool(poolConfig);
      DatabaseConnection.instance.on('error', (err) => {
        console.error('SYNAP DB ERROR:', err.message);
        DatabaseConnection.handleReconnection();
      });
      console.log('SYNAP: Conexion a PostgreSQL establecida');
    }
    return DatabaseConnection.instance;
  }

  private static handleReconnection(): void {
    if (DatabaseConnection.reconnectAttempts < DatabaseConnection.maxReconnectAttempts) {
      DatabaseConnection.reconnectAttempts++;
      console.log(`SYNAP: Reintentando conexion (${DatabaseConnection.reconnectAttempts}/${DatabaseConnection.maxReconnectAttempts})...`);
      setTimeout(() => {
        DatabaseConnection.instance = new Pool(poolConfig);
      }, DatabaseConnection.reconnectDelay);
    }
  }

  static async query(text: string, params?: any[]): Promise<any> {
    const client = await DatabaseConnection.getInstance().connect();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
    }
  }

  static async transaction(callback: (client: any) => Promise<any>): Promise<any> {
    const client = await DatabaseConnection.getInstance().connect();
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
