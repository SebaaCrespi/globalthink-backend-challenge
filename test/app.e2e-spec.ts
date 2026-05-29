import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

interface AuthResponse {
  accessToken: string;
}

interface ProfileResponse {
  firstName: string;
  lastName: string;
  bio?: string;
}

interface UserResponse {
  id: string;
  email: string;
  role: string;
  profile: ProfileResponse;
  password?: string;
}

interface PaginatedUsers {
  data: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

describe('App (e2e)', () => {
  let app: INestApplication;
  let mongoServer: MongoMemoryServer;
  let httpServer: ReturnType<INestApplication['getHttpServer']>;

  let accessToken: string;
  let userId: string;

  const testUser = {
    email: 'e2e@test.com',
    password: 'Test1234!',
    profile: { firstName: 'E2E', lastName: 'Test' },
  };

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();

    process.env.MONGODB_URI = mongoServer.getUri();
    process.env.JWT_SECRET = 'e2e-test-secret-key-1234567890';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.BCRYPT_SALT_ROUNDS = '10';
    process.env.NODE_ENV = 'test';

    const { AppModule } = await import('../src/app.module');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();
    httpServer = app.getHttpServer();
  });

  afterAll(async () => {
    await app.close();
    await mongoServer.stop();
  });

  describe('Auth', () => {
    it('POST /auth/register with valid data -> 201 with accessToken', async () => {
      const res = await request(httpServer).post('/auth/register').send(testUser).expect(201);

      const body = res.body as AuthResponse;
      expect(typeof body.accessToken).toBe('string');
      expect(body.accessToken.length).toBeGreaterThan(0);
      accessToken = body.accessToken;
    });

    it('POST /auth/register with duplicate email -> 409', async () => {
      await request(httpServer).post('/auth/register').send(testUser).expect(409);
    });

    it('POST /auth/register without password -> 400', async () => {
      await request(httpServer)
        .post('/auth/register')
        .send({ email: 'nopass@test.com', profile: { firstName: 'No', lastName: 'Pass' } })
        .expect(400);
    });

    it('POST /auth/login with valid credentials -> 200 with accessToken', async () => {
      const res = await request(httpServer)
        .post('/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      const body = res.body as AuthResponse;
      expect(typeof body.accessToken).toBe('string');
    });

    it('POST /auth/login with wrong password -> 401', async () => {
      await request(httpServer)
        .post('/auth/login')
        .send({ email: testUser.email, password: 'WrongPassword1!' })
        .expect(401);
    });

    it('POST /auth/login with non-existent email -> 401', async () => {
      await request(httpServer)
        .post('/auth/login')
        .send({ email: 'ghost@test.com', password: testUser.password })
        .expect(401);
    });

    it('GET /auth/profile without token -> 401', async () => {
      await request(httpServer).get('/auth/profile').expect(401);
    });

    it('GET /auth/profile with valid token -> 200 with user data (no password)', async () => {
      const res = await request(httpServer)
        .get('/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as UserResponse;
      expect(body.id).toBeDefined();
      expect(body.email).toBe(testUser.email);
      expect(body.profile.firstName).toBe(testUser.profile.firstName);
      expect(body.password).toBeUndefined();

      userId = body.id;
    });
  });

  describe('Users CRUD', () => {
    it('GET /users without token -> 401', async () => {
      await request(httpServer).get('/users').expect(401);
    });

    it('GET /users with token -> 200 with paginated shape', async () => {
      const res = await request(httpServer)
        .get('/users')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as PaginatedUsers;
      expect(Array.isArray(body.data)).toBe(true);
      expect(typeof body.total).toBe('number');
      expect(typeof body.page).toBe('number');
      expect(typeof body.limit).toBe('number');
      expect(typeof body.totalPages).toBe('number');
    });

    it('GET /users/:id with existing id -> 200 with correct data', async () => {
      const res = await request(httpServer)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as UserResponse;
      expect(body.id).toBe(userId);
      expect(body.email).toBe(testUser.email);
    });

    it('GET /users/:id with non-existent valid ObjectId -> 404', async () => {
      await request(httpServer)
        .get('/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('GET /users/:id with invalid id -> 400', async () => {
      await request(httpServer)
        .get('/users/not-a-valid-id')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('PATCH /users/:id updates profile.firstName -> 200', async () => {
      const res = await request(httpServer)
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ profile: { firstName: 'Updated', lastName: 'Test' } })
        .expect(200);

      const body = res.body as UserResponse;
      expect(body.profile.firstName).toBe('Updated');
    });

    it('DELETE /users/:id -> 204 and subsequent GET -> 404', async () => {
      await request(httpServer)
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      await request(httpServer)
        .get(`/users/${userId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });
  });

  describe('Pagination and filters', () => {
    beforeAll(async () => {
      await request(httpServer)
        .post('/auth/register')
        .send({
          email: 'page1@test.com',
          password: 'Test1234!',
          profile: { firstName: 'Alice', lastName: 'Wonder' },
        })
        .expect(201);

      await request(httpServer)
        .post('/auth/register')
        .send({
          email: 'page2@test.com',
          password: 'Test1234!',
          profile: { firstName: 'Bob', lastName: 'Builder' },
        })
        .expect(201);
    });

    it('GET /users?page=1&limit=1 -> data.length === 1 and totalPages > 1', async () => {
      const res = await request(httpServer)
        .get('/users?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as PaginatedUsers;
      expect(body.data).toHaveLength(1);
      expect(body.totalPages).toBeGreaterThan(1);
    });

    it('GET /users?search=Alice filters by firstName', async () => {
      const res = await request(httpServer)
        .get('/users?search=Alice')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      const body = res.body as PaginatedUsers;
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data.some((user) => user.profile.firstName === 'Alice')).toBe(true);
    });
  });
});
