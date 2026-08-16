import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export type WidgetType =
  | 'line_chart'
  | 'gauge'
  | 'table'
  | 'map'
  | 'metric'
  | 'bar_chart';

export class CreateDashboardDto {
  @ApiProperty({ example: 'Monitoreo Gemelo Digital - Bloque C' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Panel general con métricas en tiempo real de temperatura, co2 y flujo' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean = false;
}

export class UpdateDashboardDto {
  @ApiProperty({ required: false, example: 'Monitoreo Gemelo Digital Actualizado' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  layout?: any[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

export class CreateWidgetDto {
  @ApiProperty({
    example: 'd8c83e1c-54a8-4c6e-8cb5-e2f9d50b4412',
    description: 'Sensor ID vinculado a este widget',
  })
  @IsUUID()
  @IsNotEmpty()
  sensorId: string;

  @ApiProperty({
    example: 'line_chart',
    enum: ['line_chart', 'gauge', 'table', 'map', 'metric', 'bar_chart'],
  })
  @IsEnum(['line_chart', 'gauge', 'table', 'map', 'metric', 'bar_chart'])
  @IsNotEmpty()
  widgetType: WidgetType;

  @ApiProperty({ example: 'Temperatura en Tiempo Real (°C)' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: {
      metricKey: 'temperature',
      unit: '°C',
      color: '#4f46e5',
      min: 0,
      max: 50,
      timeRange: '1h',
    },
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiProperty({
    example: { x: 0, y: 0, w: 6, h: 4 },
  })
  @IsOptional()
  @IsObject()
  position?: { x: number; y: number; w: number; h: number };
}

export class UpdateWidgetDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  position?: { x: number; y: number; w: number; h: number };
}
