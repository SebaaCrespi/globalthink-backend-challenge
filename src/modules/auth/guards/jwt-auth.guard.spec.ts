import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as passport from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: { getAllAndOverride: jest.Mock };

  const handler = (): void => undefined;
  const klass = (): void => undefined;

  const context = {
    getHandler: () => handler,
    getClass: () => klass,
  } as unknown as ExecutionContext;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(reflector as unknown as Reflector);
  });

  it('returns true directly without calling super.canActivate when the route is public', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const superSpy = jest.spyOn(passport.AuthGuard('jwt').prototype, 'canActivate');

    const result = guard.canActivate(context);

    expect(result).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(IS_PUBLIC_KEY, [handler, klass]);
    expect(superSpy).not.toHaveBeenCalled();

    superSpy.mockRestore();
  });

  it('delegates to super.canActivate when the route is not public', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const superSpy = jest
      .spyOn(passport.AuthGuard('jwt').prototype, 'canActivate')
      .mockReturnValue(true);

    const result = guard.canActivate(context);

    expect(superSpy).toHaveBeenCalledWith(context);
    expect(result).toBe(true);

    superSpy.mockRestore();
  });
});
