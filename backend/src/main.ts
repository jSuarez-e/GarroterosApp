/**
 * @sdd
 * [Objetivo]: Bootstrap principal de la aplicacion backend NestJS, tuberias globales y politicas de seguridad.
 * [I/O]: Inicializa AppModule en el puerto PORT (default 3000) con prefijo api/v1, ValidationPipe global y CORS.
 * [Edge Cases]: Transformacion automatica y rechazo de propiedades no listadas (whitelist/forbidNonWhitelisted).
 */

import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module.js';
import { resolveApplicationPort } from './common/utils/port.util.js';

/**
 * Inicializa y arranca la instancia del servidor HTTP NestJS.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('Iniciando proceso de bootstrap de NestJS...');

  const app = await NestFactory.create(AppModule);

  // Aumento de límite para cargas de fotos y telemetría
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Validación estricta de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Configuración de CORS para el cliente Ionic/Capacitor
  const defaultOrigins = 'http://localhost:8100,http://localhost:4200,capacitor://localhost,https://localhost,http://localhost';
  app.enableCors({
    origin: (process.env.CORS_ORIGIN || defaultOrigins).split(',').map((originItem) => originItem.trim()),
    credentials: true,
  });

  const rawPort = process.env.PORT;
  const port = resolveApplicationPort(rawPort);
  logger.log(`Enlazando servidor HTTP en 0.0.0.0:${port} (PORT crudo recibido: "${rawPort ?? 'undefined'}")...`);
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 Backend server running on port ${port} (bound to 0.0.0.0/api/v1)`);
}
await bootstrap();
