/**
 * @sdd
 * [Objetivo]: Suite de prueba End-to-End (E2E) para verificar el endpoint raiz de la aplicacion backend NestJS.
 * [I/O]: Instancia TestingModule con AppModule e invoca GET / con Supertest esperando status 200 y 'Hello World!'.
 * [Edge Cases]: Ciclo de vida completo del servidor de pruebas con arranque en beforeEach y cierre garantizado en afterEach.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  afterEach(async () => {
    await app.close();
  });
});
