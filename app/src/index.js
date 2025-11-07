import app from './server.js';
import {initDb, closeDb} from './db.js';
import {logger} from './logger.js';

const port = process.env.PORT || 8080;

async function start() {
  try {
    await initDb();
    const server = app.listen(port, () => {
      logger.info(`Service listening on port ${port}`);
    });

    const shutdown = async (signal) => {
      logger.info(`${signal} received, shutting down`);
      await closeDb();
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => {
      void shutdown('SIGINT');
    });

    process.on('SIGTERM', () => {
      void shutdown('SIGTERM');
    });
  } catch (err) {
    logger.error({err}, 'Failed to start service');
    process.exit(1);
  }
}

void start();
