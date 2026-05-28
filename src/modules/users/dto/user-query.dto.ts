import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class UserQueryDto {
  @ApiPropertyOptional({ description: 'Texto libre para buscar por email, nombre, apellido o bio' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ description: 'Número de página', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: 'Cantidad de elementos por página',
    default: 10,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: 'Campo por el cual ordenar', default: 'createdAt' })
  @IsString()
  @IsOptional()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sentido del ordenamiento',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}
