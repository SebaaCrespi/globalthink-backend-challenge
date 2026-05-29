import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { UserDocument, UserRole } from '../users/schemas/user.schema';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

jest.mock('bcrypt', () => ({
  ...jest.requireActual<typeof import('bcrypt')>('bcrypt'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const now = new Date('2026-01-01T00:00:00.000Z');

  const userResponse: UserResponseDto = {
    id: '507f1f77bcf86cd799439011',
    email: 'ernesto@example.com',
    role: UserRole.USER,
    profile: { firstName: 'Ernesto', lastName: 'Guevara' },
    createdAt: now,
    updatedAt: now,
  };

  const mockUsersService = {
    create: jest.fn(),
    findOne: jest.fn(),
    findByEmailWithPassword: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockJwtService.sign.mockReturnValue('signed.jwt.token');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    const dto: CreateUserDto = {
      email: 'ernesto@example.com',
      password: 'securePassword123',
      profile: { firstName: 'Ernesto', lastName: 'Guevara' },
    };

    it('creates the user, signs a JWT and returns the accessToken', async () => {
      mockUsersService.create.mockResolvedValue(userResponse);

      const result = await service.register(dto);

      expect(mockUsersService.create).toHaveBeenCalledWith(dto);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: userResponse.id,
        email: userResponse.email,
        role: userResponse.role,
      });
      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    });

    it('propagates ConflictException on duplicate email', async () => {
      mockUsersService.create.mockRejectedValue(new ConflictException('Email already registered'));

      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const dto: LoginDto = { email: 'ernesto@example.com', password: 'securePassword123' };

    const userDoc = {
      id: '507f1f77bcf86cd799439011',
      email: 'ernesto@example.com',
      password: 'hashed-password',
      role: UserRole.USER,
    } as unknown as UserDocument;

    it('returns accessToken when credentials are valid', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(userDoc);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(dto);

      expect(mockUsersService.findByEmailWithPassword).toHaveBeenCalledWith(dto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(dto.password, userDoc.password);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        sub: userDoc.id,
        email: userDoc.email,
        role: userDoc.role,
      });
      expect(result).toEqual({ accessToken: 'signed.jwt.token' });
    });

    it('throws UnauthorizedException when the email does not exist', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(null);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      mockUsersService.findByEmailWithPassword.mockResolvedValue(userDoc);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
      expect(mockJwtService.sign).not.toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('delegates to UsersService.findOne and returns the UserResponseDto', async () => {
      mockUsersService.findOne.mockResolvedValue(userResponse);

      const result = await service.getProfile(userResponse.id);

      expect(mockUsersService.findOne).toHaveBeenCalledWith(userResponse.id);
      expect(result).toEqual(userResponse);
    });

    it('propagates NotFoundException', async () => {
      mockUsersService.findOne.mockRejectedValue(new NotFoundException('User not found'));

      await expect(service.getProfile('missing')).rejects.toThrow(NotFoundException);
    });
  });
});
