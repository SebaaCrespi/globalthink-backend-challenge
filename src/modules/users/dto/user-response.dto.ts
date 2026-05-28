import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProfileResponseDto {
  @ApiProperty({ example: 'Sebastian' })
  firstName!: string;

  @ApiProperty({ example: 'Crespi' })
  lastName!: string;

  @ApiPropertyOptional({ example: 'Full-Stack Developer de Córdoba' })
  bio?: string;
}

export class UserResponseDto {
  @ApiProperty({ example: '507f1f77bcf86cd799439011' })
  id!: string;

  @ApiProperty({ example: 'sebastian@example.com' })
  email!: string;

  @ApiProperty({ example: 'user' })
  role!: string;

  @ApiProperty({ type: ProfileResponseDto })
  profile!: ProfileResponseDto;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class PaginatedUsersDto {
  @ApiProperty({ type: [UserResponseDto] })
  data!: UserResponseDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 5 })
  totalPages!: number;
}
