import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  const mockConfigService = {
    getOrThrow: jest.fn().mockReturnValue('test-secret'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.getOrThrow.mockReturnValue('test-secret');
    strategy = new JwtStrategy(mockConfigService as unknown as ConfigService);
  });

  it('reads the jwt secret from the ConfigService', () => {
    expect(mockConfigService.getOrThrow).toHaveBeenCalledWith('jwt.secret');
  });

  it('maps the payload to the request user object', () => {
    const result = strategy.validate({ sub: '123', email: 'test@test.com', role: 'user' });

    expect(result).toEqual({ userId: '123', email: 'test@test.com', role: 'user' });
  });
});
