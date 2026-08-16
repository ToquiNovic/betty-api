import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({ example: 'Laboratorio de Robótica e IoT' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Equipo de investigación para sensores ambientales y gemelos digitales' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateTeamDto {
  @ApiProperty({ example: 'Laboratorio de Robótica e IoT Avanzado' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'Descripción actualizada' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class JoinByCodeDto {
  @ApiProperty({ example: 'A8B2C4D6' })
  @IsString()
  @IsNotEmpty()
  code: string;
}

export class InviteMemberDto {
  @ApiProperty({ example: 'investigador@universidad.edu.co' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
