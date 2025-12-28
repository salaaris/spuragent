import { Pool, QueryResult } from 'pg';

export interface Conversation {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export class Database {
  private pool: Pool;

  constructor(connectionString?: string) {
    // Support both DATABASE_URL and individual connection parameters
    const connectionConfig = connectionString || process.env.DATABASE_URL || {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'spur_agent',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || '',
    };

    this.pool = new Pool(
      typeof connectionConfig === 'string'
        ? { 
            connectionString: connectionConfig,
            ssl: process.env.NODE_ENV === 'production' || connectionConfig.includes('render.com') 
              ? { rejectUnauthorized: false } 
              : false
          }
        : { ...connectionConfig, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false }
    );

    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });

    console.log('Connected to PostgreSQL database');
  }

  async initialize(): Promise<void> {
    // Create conversations table
    await this.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id VARCHAR(255) PRIMARY KEY,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create messages table
    await this.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        "conversationId" VARCHAR(255) NOT NULL,
        sender VARCHAR(10) NOT NULL CHECK(sender IN ('user', 'ai')),
        text TEXT NOT NULL,
        timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
        FOREIGN KEY ("conversationId") REFERENCES conversations(id) ON DELETE CASCADE
      )
    `);

    // Create indexes for better query performance
    await this.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_conversationId 
      ON messages("conversationId")
    `);

    await this.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp 
      ON messages(timestamp)
    `);

    console.log('Database initialized');
  }

  private async query(text: string, params?: any[]): Promise<QueryResult> {
    const client = await this.pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }

  async createConversation(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.query(
      'INSERT INTO conversations (id, "createdAt", "updatedAt") VALUES ($1, $2, $3)',
      [id, now, now]
    );
  }

  async updateConversation(id: string): Promise<void> {
    const now = new Date().toISOString();
    await this.query(
      'UPDATE conversations SET "updatedAt" = $1 WHERE id = $2',
      [now, id]
    );
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const result = await this.query(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
    );
    if (result.rows.length === 0) {
      return null;
    }
    const row = result.rows[0];
    return {
      id: row.id,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async createMessage(message: Omit<Message, 'id'>): Promise<string> {
    const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.query(
      'INSERT INTO messages (id, "conversationId", sender, text, timestamp) VALUES ($1, $2, $3, $4, $5)',
      [id, message.conversationId, message.sender, message.text, message.timestamp]
    );
    return id;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const result = await this.query(
      'SELECT * FROM messages WHERE "conversationId" = $1 ORDER BY timestamp ASC',
      [conversationId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      conversationId: row.conversationId,
      sender: row.sender,
      text: row.text,
      timestamp: row.timestamp,
    }));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
