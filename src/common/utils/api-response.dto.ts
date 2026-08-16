import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto<T = any> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message?: string;

  @ApiProperty({ required: false })
  data?: T;

  @ApiProperty({ required: false })
  error?: any;

  @ApiProperty({ example: '2026-08-15T20:00:00.000Z' })
  timestamp: string;

  static success<T>(data?: T, message = 'Success'): ApiResponseDto<T> {
    return {
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  static error(message = 'Error', error?: any): ApiResponseDto<null> {
    return {
      success: false,
      message,
      error,
      timestamp: new Date().toISOString(),
    };
  }
}
