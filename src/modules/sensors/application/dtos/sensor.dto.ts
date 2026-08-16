import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateSensorDto {
  @ApiProperty({ example: 'Sensor Temperatura y Humedad DHT22' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Sensor ubicado en el laboratorio de robótica bloque C' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'd8c83e1c-54a8-4c6e-8cb5-e2f9d50b4412',
    description: 'ID del equipo al que pertenece el sensor (omitir para sensor privado)',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  teamId?: string;

  @ApiProperty({
    example: { model: 'DHT22', location: 'Edificio C - Lab 3', intervalSeconds: 5 },
    required: false,
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateSensorDto {
  @ApiProperty({ example: 'Sensor Temperatura DHT22 Actualizado' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Nueva descripción' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class QuerySensorDataDto {
  @ApiProperty({ required: false, example: '2026-08-01T00:00:00Z' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ required: false, example: '2026-08-15T23:59:59Z' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiProperty({ required: false, enum: ['sensor', 'metaverso'] })
  @IsOptional()
  @IsEnum(['sensor', 'metaverso'])
  originType?: 'sensor' | 'metaverso';

  @ApiProperty({ required: false, default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number = 100;
}
