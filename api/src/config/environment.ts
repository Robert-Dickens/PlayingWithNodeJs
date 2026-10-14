const readNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getFirstDefinedValue = (...keys: string[]): string | undefined =>
  keys
    .map((key) => process.env[key])
    .find((value) => !!value && value.trim())
    ?? undefined;

const getConnectionStringValue = (name: string): string | undefined => {
  const value = process.env[name];
  if (value && value.trim()) {
    return value;
  }

  const signal = name.replace('ConnectionStrings__', '');
  const fallbackNames = [
    `ConnectionStrings__${signal}`,
    `POSTGRES_${signal.toUpperCase()}`,
    `PG${signal.toUpperCase()}`,
  ];

  return getFirstDefinedValue(...fallbackNames);
};

const parsePostgresConnectionString = (connectionString: string) => {
  if (/^(postgres|postgresql):\/\//i.test(connectionString)) {
    const normalized = connectionString.replace(/^postgres:\/\//i, 'postgresql://');
    const parsed = new URL(normalized);
    return {
      host: parsed.hostname,
      port: readNumber(parsed.port, 5432),
      name: decodeURIComponent(parsed.pathname.replace(/^\//, '')) || 'productdb',
      user: decodeURIComponent(parsed.username || 'postgres'),
      password: decodeURIComponent(parsed.password || 'postgres'),
    };
  }

  // Aspire's PostgreSQL resource supplies an Npgsql-style string such as
  // Host=...;Port=...;Database=...;Username=...;Password=...
  const values = new Map<string, string>();
  for (const part of connectionString.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0) continue;

    const key = part.slice(0, separator).trim().toLowerCase();
    const value = part.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
    if (key) values.set(key, value);
  }

  const host = values.get('host') ?? values.get('server');
  if (!host) {
    throw new Error('Unsupported PostgreSQL connection string: expected a PostgreSQL URL or Host=... string');
  }

  return {
    host,
    port: readNumber(values.get('port'), 5432),
    name: values.get('database') ?? values.get('initial catalog') ?? 'productdb',
    user: values.get('username') ?? values.get('user id') ?? values.get('userid') ?? values.get('user') ?? 'postgres',
    password: values.get('password') ?? 'postgres',
  };
};

const getDatabaseFromConnectionString = () => {
  const connectionString =
    getConnectionStringValue('ConnectionStrings__productdb') ??
    getConnectionStringValue('ConnectionStrings__postgresdb') ??
    getFirstDefinedValue('PRODUCTDB_URI', 'POSTGRES_URI') ??
    process.env.POSTGRES_CONNECTION_STRING ??
    process.env.DATABASE_URL;

  if (!connectionString) {
    return {
      host: process.env.DB_HOST || process.env.POSTGRES_HOST || 'localhost',
      port: readNumber(process.env.DB_PORT || process.env.POSTGRES_PORT, 5432),
      name: process.env.DB_NAME || process.env.POSTGRES_DB || 'productdb',
      user: process.env.DB_USER || process.env.POSTGRES_USER || 'postgres',
      password: process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'postgres',
    };
  }

  return parsePostgresConnectionString(connectionString);
};

const getRedisFromConnectionString = () => {
  const connectionString =
    getFirstDefinedValue('REDIS_URI', 'REDIS_URL', 'REDIS_CONNECTION_STRING') ??
    getConnectionStringValue('ConnectionStrings__redis') ??
    (() => {
      const isTls = process.env.REDIS_TLS?.toLowerCase() === 'true';
      const scheme = isTls ? 'rediss' : 'redis';
      const host = process.env.REDIS_HOST || 'localhost';
      const port = readNumber(process.env.REDIS_PORT, isTls ? 6380 : 6379);
      const username = process.env.REDIS_USERNAME || process.env.REDIS_USER;
      const password = process.env.REDIS_PASSWORD;
      const credentials = password
        ? `${encodeURIComponent(username || '')}:${encodeURIComponent(password)}@`
        : username
          ? `${encodeURIComponent(username)}@`
          : '';

      return `${scheme}://${credentials}${host}:${port}`;
    })();

  try {
    const [address, ...optionParts] = connectionString.split(',');
    const normalized = address.includes('://') ? address : `redis://${address}`;
    const parsed = new URL(normalized);
    const options = new Map(
      optionParts
        .map((part) => part.split(/=(.*)/s, 2))
        .filter(([key, value]) => !!key && value !== undefined)
        .map(([key, value]) => [key.trim().toLowerCase(), value.trim()]),
    );
    const isTls = parsed.protocol.toLowerCase() === 'rediss:' || options.get('ssl')?.toLowerCase() === 'true';
    const username = options.get('user') ?? options.get('username');
    const password = options.get('password');

    parsed.protocol = isTls ? 'rediss:' : 'redis:';
    if (password !== undefined) {
      parsed.username = username ?? '';
      parsed.password = password;
    } else if (username) {
      parsed.username = username;
    }

    const host = parsed.hostname || 'localhost';
    const port = readNumber(parsed.port, isTls ? 6380 : 6379);

    return {
      host,
      port,
      tls: isTls,
      url: parsed.toString(),
    };
  } catch {
    return {
      host: 'localhost',
      port: 6379,
      tls: false,
      url: 'redis://localhost:6379',
    };
  }
};

const getRabbitMQFromConnectionString = () => {
  const connectionString =
    getConnectionStringValue('ConnectionStrings__rabbitmq') ??
    process.env.RABBITMQ_URI ??
    process.env.RABBITMQ_URL ??
    'amqp://guest:guest@localhost:5672';

  try {
    const parsed = new URL(connectionString.startsWith('amqp://') ? connectionString : `amqp://${connectionString}`);
    return {
      url: `${parsed.protocol}//${parsed.username ? `${encodeURIComponent(parsed.username)}:${encodeURIComponent(parsed.password || '')}@` : ''}${parsed.hostname || 'localhost'}:${parsed.port || 5672}`,
    };
  } catch {
    return {
      url: 'amqp://guest:guest@localhost:5672',
    };
  }
};

export const config = {
  port: parseInt(process.env.API_PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Database
  database: getDatabaseFromConnectionString(),

  // Redis
  redis: getRedisFromConnectionString(),

  // RabbitMQ
  rabbitmq: getRabbitMQFromConnectionString(),

  // WebSocket
  websocket: {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
    },
  },

  // Telemetry / OpenTelemetry
  telemetry: {
    logLevel: process.env.LOG_LEVEL || 'info',
  },
};
