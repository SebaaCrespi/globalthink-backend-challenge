import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Types } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserRole } from './schemas/user.schema';
import { UsersService } from './users.service';

jest.mock('bcrypt');

interface MockChain {
  sort: jest.Mock;
  skip: jest.Mock;
  limit: jest.Mock;
  lean: jest.Mock;
  exec: jest.Mock;
}

const buildFindChain = (result: unknown): MockChain => {
  const chain: Partial<MockChain> = {};
  chain.sort = jest.fn().mockReturnValue(chain);
  chain.skip = jest.fn().mockReturnValue(chain);
  chain.limit = jest.fn().mockReturnValue(chain);
  chain.lean = jest.fn().mockReturnValue(chain);
  chain.exec = jest.fn().mockResolvedValue(result);
  return chain as MockChain;
};

const buildLeanChain = (result: unknown) => ({
  lean: jest.fn().mockReturnValue({ exec: jest.fn().mockResolvedValue(result) }),
});

describe('UsersService', () => {
  let service: UsersService;

  const objectId = new Types.ObjectId();
  const idStr = objectId.toString();
  const now = new Date('2026-01-01T00:00:00.000Z');

  const makeLeanUser = (overrides: Record<string, unknown> = {}) => ({
    _id: objectId,
    email: 'test@example.com',
    password: 'hashed',
    role: UserRole.USER,
    profile: { firstName: 'Test', lastName: 'User', bio: 'A bio' },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  });

  // Constructor-style mock: `new this.userModel(...)` returns instance with .save()
  const savedDoc = makeLeanUser();
  const saveMock = jest.fn().mockResolvedValue(savedDoc);

  const ModelCtor = jest.fn().mockImplementation(() => ({ save: saveMock }));
  const mockUserModel = Object.assign(ModelCtor, {
    find: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndDelete: jest.fn(),
    countDocuments: jest.fn(),
  });

  const mockConfigService = {
    get: jest.fn().mockReturnValue(10),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(10);
    saveMock.mockResolvedValue(savedDoc);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('create', () => {
    const dto: CreateUserDto = {
      email: 'new@example.com',
      password: 'plaintext123',
      profile: { firstName: 'New', lastName: 'User' },
    };

    it('hashes password, creates document, returns UserResponseDto without password', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');

      const result = await service.create(dto);

      expect(bcrypt.hash).toHaveBeenCalledWith('plaintext123', 10);
      expect(ModelCtor).toHaveBeenCalledWith({ ...dto, password: 'hashed-pw' });
      expect(saveMock).toHaveBeenCalled();
      expect(result).toEqual({
        id: idStr,
        email: 'test@example.com',
        role: UserRole.USER,
        profile: { firstName: 'Test', lastName: 'User', bio: 'A bio' },
        createdAt: now,
        updatedAt: now,
      });
      expect(Object.keys(result)).not.toContain('password');
    });

    it('throws ConflictException on duplicate key error (11000)', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      saveMock.mockRejectedValueOnce(Object.assign(new Error('dup'), { code: 11000 }));

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it('rethrows non-duplicate errors', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-pw');
      saveMock.mockRejectedValueOnce(new Error('boom'));

      await expect(service.create(dto)).rejects.toThrow('boom');
    });
  });

  describe('findAll', () => {
    it('returns PaginatedUsersDto with correct shape (no search, defaults applied)', async () => {
      const docs = [makeLeanUser()];
      mockUserModel.find.mockReturnValue(buildFindChain(docs));
      mockUserModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const result = await service.findAll({});

      expect(mockUserModel.find).toHaveBeenCalledWith({});
      expect(result).toEqual({
        data: [
          {
            id: idStr,
            email: 'test@example.com',
            role: UserRole.USER,
            profile: { firstName: 'Test', lastName: 'User', bio: 'A bio' },
            createdAt: now,
            updatedAt: now,
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });

    it('builds $or regex filter when search is provided', async () => {
      mockUserModel.find.mockReturnValue(buildFindChain([]));
      mockUserModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({ search: 'foo' });

      const calls = mockUserModel.find.mock.calls as unknown as [{ $or: { email: RegExp }[] }][];
      const calledFilter = calls[0][0];
      expect(calledFilter).toHaveProperty('$or');
      expect(calledFilter.$or).toHaveLength(4);
      expect(calledFilter.$or[0].email).toBeInstanceOf(RegExp);
      expect(calledFilter.$or[0].email.source).toBe('foo');
      expect(calledFilter.$or[0].email.flags).toContain('i');
    });

    it('applies custom pagination and sorting', async () => {
      const chain = buildFindChain([]);
      mockUserModel.find.mockReturnValue(chain);
      mockUserModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      await service.findAll({
        page: 3,
        limit: 5,
        sortBy: 'email',
        sortOrder: 'asc',
      });

      expect(chain.sort).toHaveBeenCalledWith({ email: 1 });
      expect(chain.skip).toHaveBeenCalledWith(10);
      expect(chain.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('findOne', () => {
    it('returns UserResponseDto on success', async () => {
      mockUserModel.findById.mockReturnValue(buildLeanChain(makeLeanUser()));

      const result = await service.findOne(idStr);

      expect(result.id).toBe(idStr);
      expect(result).not.toHaveProperty('password');
    });

    it('throws BadRequestException on invalid ObjectId', async () => {
      await expect(service.findOne('not-an-id')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserModel.findById.mockReturnValue(buildLeanChain(null));

      await expect(service.findOne(idStr)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const dto: UpdateUserDto = { email: 'updated@example.com' };

    it('returns updated UserResponseDto', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(
        buildLeanChain(makeLeanUser({ email: 'updated@example.com' })),
      );

      const result = await service.update(idStr, dto);

      expect(result.email).toBe('updated@example.com');
      expect(result).not.toHaveProperty('password');
    });

    it('re-hashes password when provided', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('rehashed');
      mockUserModel.findByIdAndUpdate.mockReturnValue(buildLeanChain(makeLeanUser()));

      const dtoWithPw: UpdateUserDto = { password: 'newpass123' };
      await service.update(idStr, dtoWithPw);

      expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 10);
      const calls = mockUserModel.findByIdAndUpdate.mock.calls as unknown as [
        string,
        { password: string },
      ][];
      expect(calls[0][1].password).toBe('rehashed');
    });

    it('throws BadRequestException on invalid ObjectId', async () => {
      await expect(service.update('bad', dto)).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue(buildLeanChain(null));

      await expect(service.update(idStr, dto)).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException on duplicate key error (11000)', async () => {
      mockUserModel.findByIdAndUpdate.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockRejectedValue(Object.assign(new Error('dup'), { code: 11000 })),
        }),
      });

      await expect(service.update(idStr, dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('resolves to void on success', async () => {
      mockUserModel.findByIdAndDelete.mockReturnValue(buildLeanChain(makeLeanUser()));

      await expect(service.remove(idStr)).resolves.toBeUndefined();
    });

    it('throws BadRequestException on invalid ObjectId', async () => {
      await expect(service.remove('bad')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when user does not exist', async () => {
      mockUserModel.findByIdAndDelete.mockReturnValue(buildLeanChain(null));

      await expect(service.remove(idStr)).rejects.toThrow(NotFoundException);
    });
  });
});
