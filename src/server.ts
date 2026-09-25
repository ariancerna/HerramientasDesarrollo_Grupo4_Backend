import { app } from './app';
import { env } from './config/env';

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`🏐 Club de Vóley API escuchando en http://localhost:${env.port}`);
  // eslint-disable-next-line no-console
  console.log(`   Entorno: ${env.nodeEnv}`);
});
