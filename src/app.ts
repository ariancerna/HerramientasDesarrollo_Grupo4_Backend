import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { buildOpenApiSpec } from './docs/openapi';
import { errorMiddleware } from './middlewares/error.middleware';
import { notFoundMiddleware } from './middlewares/not-found.middleware';
import apiRouter from './routes';

// Importa (una sola vez) todos los *.docs.ts registrados en src/docs/data/index.ts.
// Cada módulo se agrega ahí mismo cuando alguien del equipo lo programa.
import './docs/data';

export const app = express();

app.use(helmet());
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json());

// SYS-01
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SYS-02 — Swagger UI real, generado desde src/docs/data/*.docs.ts.
// El botón "Authorize" (candado, arriba a la derecha) es donde pegas tu
// accessToken una sola vez; Swagger lo manda como Bearer en cada "Try it out".
app.get('/api/v1/openapi.json', (_req, res) => {
  res.json(buildOpenApiSpec());
});
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(buildOpenApiSpec()));

app.use('/api/v1', apiRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);