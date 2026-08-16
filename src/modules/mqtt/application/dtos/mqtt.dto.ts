import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class MqttAuthDto {
  @ApiProperty({ description: 'Sensor ID (UUID) or system admin username' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ description: 'Sensor API Key (betty_live_...) or system password' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientid?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ipaddress?: string;
}

export class MqttWebhookDto {
  @ApiProperty({ example: 'betty/sensor/d8c83e1c-54a8-4c6e-8cb5-e2f9d50b4412/data' })
  @IsString()
  @IsNotEmpty()
  topic: string;

  @ApiProperty({
    example: {
      origin_type: 'sensor',
      temperature: 24.5,
      humidity: 58.2,
      co2: 412,
    },
  })
  payload: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientid?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  timestamp?: number;
}
