import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

type HealthResponse = {
  status: string;
  ready?: boolean;
  dependencies?: { database: { status: string } };
};

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/api/health/live (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health/live')
      .expect(200)
      .expect(({ body }) => {
        const health = body as unknown as HealthResponse;
        expect(health.status).toBe('ok');
      });
  });

  it('/api/health/ready (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health/ready')
      .expect(200)
      .expect(({ body }) => {
        const health = body as unknown as HealthResponse;
        expect(health.status).toBe('ok');
        expect(health.ready).toBe(true);
        expect(health.dependencies?.database.status).toBe('ok');
      });
  });

  it('/api/assets/uploads/:filename (GET) requires authentication', () => {
    return request(app.getHttpServer())
      .get('/api/assets/uploads/not-a-real-file.png')
      .expect(401);
  });
});
