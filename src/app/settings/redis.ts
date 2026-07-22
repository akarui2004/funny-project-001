import ansis from 'ansis';
import RedisClient, { Redis as IORedisInstance } from 'ioredis';
import { appConfig } from 'src/app';
import { TRedisSchema } from '../config/config.type';

class Redis {
  private redisConfig: TRedisSchema;

  // Define the client that redis connect by type
  private clients: Partial<Record<keyof TRedisSchema, IORedisInstance>> = {};

  public constructor() {
    this.redisConfig = appConfig.redis;
  }

  public initialize(redisType: keyof TRedisSchema = 'master') {
    const typeKey = String(redisType);
    const redisConn = this.redisConfig[redisType];

    // Early exit if connection already exists
    if (this.clients[redisType]) {
      return;
    }

    const { host, port, password, keyPrefix, db, option } = redisConn;
    const { connectionTimeout, ...restOptions } = option;
    const client = new RedisClient({
      host, port, password,
      keyPrefix,
      db: db ?? 0,
      connectTimeout: connectionTimeout,
      ...restOptions,
    })

    client.on('connect', () => {
      console.log(ansis.yellowBright.bold(`[Redis:${typeKey}] Connecting to ${redisConn.host}:${redisConn.port}...`));
    });
    client.on('ready', () => {
      console.log(ansis.greenBright.bold(`✅ [Redis:${typeKey}] Connected and ready!`));
    });
    client.on('error', (err: any) => {
      console.error(ansis.redBright.bold(`❌ [Redis:${typeKey}] Error:`), err.message);
    });

    this.clients[redisType] = client;
  }

  public getClient(redisType: keyof TRedisSchema = 'master') {
    const client = this.clients[redisType];
    if (!client) {
      throw new Error(`[Redis] Client '${String(redisType)}' does not initialize. Please initialize it first.`)
    }

    return client;
  }

  public async disconnect(redisType: keyof TRedisSchema = 'master'): Promise<void> {
    const typeKey = String(redisType);
    const client = this.clients[redisType];

    // Early return because the client already disconnected
    if (!client) {
      return;
    }

    try {
      // Attempt graceful quit
      await client.quit();
      console.log(ansis.blueBright.bold(`🔌 [Redis:${typeKey}] Gracefully disconnected.`));
    } catch (error) {
      // Force disconnect even the quiting failed
      console.warn(ansis.yellow.bold(`⚠️ [Redis:${typeKey}] Graceful quit failed, forcing disconnect...`));
      client.disconnect();
    } finally {
      delete this.clients[redisType];
    }
  }

  public async disconnectAll(): Promise<void> {
    const activeTypes = Object.keys(this.clients) as (keyof TRedisSchema)[];

    // Already disconnected all, early return
    if (activeTypes.length === 0) {
      return;
    }

    console.log(ansis.cyanBright.bold(`🔌 Closing all active Redis connections...`));

    await Promise.allSettled(
      activeTypes.map((type) => this.disconnect(type))
    );
  }
}

export const appRedis = new Redis();
