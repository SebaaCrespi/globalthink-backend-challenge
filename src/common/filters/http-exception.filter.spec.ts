import { ArgumentsHost, BadRequestException, HttpStatus, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { HttpExceptionFilter } from './http-exception.filter';

interface ErrorBody {
  statusCode: number;
  timestamp: string;
  path: string;
  message: string | string[];
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let json: jest.Mock<void, [ErrorBody]>;
  let status: jest.Mock;
  let host: ArgumentsHost;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    json = jest.fn<void, [ErrorBody]>();
    status = jest.fn(() => ({ json }));

    const response = { status } as unknown as Response;
    const request = { url: '/test-path' } as unknown as Request;

    host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
  });

  const lastBody = (): ErrorBody => json.mock.calls[0][0];

  it('captures an HttpException with a custom status', () => {
    filter.catch(new NotFoundException('Resource not found'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    const body = lastBody();
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('Resource not found');
  });

  it('maps a generic Error to a 500 with a generic message', () => {
    filter.catch(new Error('something blew up'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    const body = lastBody();
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
  });

  it('preserves the message array produced by ValidationPipe', () => {
    const messages = ['name should not be empty', 'email must be an email'];
    filter.catch(new BadRequestException(messages), host);

    const body = lastBody();
    expect(Array.isArray(body.message)).toBe(true);
    expect(body.message).toEqual(messages);
  });

  it('includes path and an ISO timestamp', () => {
    filter.catch(new NotFoundException(), host);

    const body = lastBody();
    expect(body.path).toBe('/test-path');
    expect(typeof body.timestamp).toBe('string');
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('extracts message from object response (real ValidationPipe shape)', () => {
    const exception = new BadRequestException({
      statusCode: 400,
      message: ['email must be valid', 'name should not be empty'],
      error: 'Bad Request',
    });

    filter.catch(exception, host);

    const body = lastBody();
    expect(body.statusCode).toBe(400);
    expect(body.message).toEqual(['email must be valid', 'name should not be empty']);
  });
});
