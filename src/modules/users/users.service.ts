import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { FlattenMaps, Model, Types, isValidObjectId } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { PaginatedUsersDto, UserResponseDto } from './dto/user-response.dto';
import { User, UserDocument } from './schemas/user.schema';

type LeanUser = FlattenMaps<User> & {
  _id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
};

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const saltRounds = this.configService.get<number>('bcrypt.saltRounds') ?? 10;
    const hashedPassword = await bcrypt.hash(dto.password, saltRounds);

    try {
      const doc = await new this.userModel({ ...dto, password: hashedPassword }).save();
      return this.toResponseDto(doc);
    } catch (error) {
      const err = error as { code?: number };
      if (err.code === 11000) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async findAll(query: UserQueryDto): Promise<PaginatedUsersDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const sortBy = query.sortBy ?? 'createdAt';
    const sortOrder = query.sortOrder ?? 'desc';

    const filter: Record<string, unknown> = {};
    if (query.search) {
      const regex = new RegExp(query.search, 'i');
      filter.$or = [
        { email: regex },
        { 'profile.firstName': regex },
        { 'profile.lastName': regex },
        { 'profile.bio': regex },
      ];
    }

    const [docs, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<LeanUser[]>()
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      data: docs.map((doc) => this.toResponseDto(doc)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<UserResponseDto> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    const doc = await this.userModel.findById(id).lean<LeanUser>().exec();
    if (!doc) {
      throw new NotFoundException('User not found');
    }
    return this.toResponseDto(doc);
  }

  async update(id: string, dto: UpdateUserDto): Promise<UserResponseDto> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID');
    }

    const updateData = { ...dto };

    if (updateData.password) {
      const saltRounds = this.configService.get<number>('bcrypt.saltRounds') ?? 10;
      updateData.password = await bcrypt.hash(updateData.password, saltRounds);
    }

    try {
      const doc = await this.userModel
        .findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
        .lean<LeanUser>()
        .exec();
      if (!doc) {
        throw new NotFoundException('User not found');
      }
      return this.toResponseDto(doc);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const err = error as { code?: number };
      if (err.code === 11000) {
        throw new ConflictException('Email already registered');
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID');
    }
    const result = await this.userModel.findByIdAndDelete(id).lean<LeanUser>().exec();
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  private toResponseDto(doc: UserDocument | LeanUser): UserResponseDto {
    const withTimestamps = doc as LeanUser;
    return {
      id: doc._id.toString(),
      email: doc.email,
      role: doc.role,
      profile: {
        firstName: doc.profile.firstName,
        lastName: doc.profile.lastName,
        ...(doc.profile.bio !== undefined && { bio: doc.profile.bio }),
      },
      createdAt: withTimestamps.createdAt ?? new Date(),
      updatedAt: withTimestamps.updatedAt ?? new Date(),
    };
  }
}
