import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'estudiante@universidad.edu.co' })
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'SecretPassword123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'estudiante@universidad.edu.co' })
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de restablecimiento recibido por correo' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewSecretPassword123!', minLength: 6 })
  @IsString()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  newPassword: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
