import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { UserRole } from '../schemas/user.schema';

export class CreateProfileDto {
  @ApiProperty({ example: 'Sebastian', description: 'Primer nombre del usuario' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ example: 'Crespi', description: 'Apellido del usuario' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({
    example: 'Full-Stack Developer de Córdoba',
    description: 'Biografía breve',
  })
  @IsString()
  @IsOptional()
  bio?: string;
}

export class CreateUserDto {
  @ApiProperty({ example: 'ernesto@example.com', description: 'Correo electrónico único' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({
    example: 'securePassword123',
    description: 'Contraseña de mínimo 8 caracteres',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({
    enum: UserRole,
    default: UserRole.USER,
    description: 'Rol asignado en el sistema',
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ type: CreateProfileDto, description: 'Información del perfil embebido' })
  @ValidateNested()
  @Type(() => CreateProfileDto)
  profile!: CreateProfileDto;
}
