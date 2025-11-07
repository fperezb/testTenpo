import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import crypto from 'node:crypto';
import {router} from './routes.js';
import {logger} from './logger.js';

const app = express();

app.use((req, _res, next) => {
  if (!req.headers['x-request-id']) {
    req.headers['x-request-id'] = crypto.randomUUID();
  }
  next();
});

app.use(express.json());
app.use(helmet());

app.get('/health', (_req, res) => {
  res.json({status: 'ok'});
});

app.use(router);

app.use((err, _req, res, _next) => {
  logger.error({err}, 'Unhandled error');
  res.status(500).json({message: 'Internal server error'});
});

export default app;
