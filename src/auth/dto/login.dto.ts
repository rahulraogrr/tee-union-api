import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'PILOT-0001', description: 'Government-issued employee ID' })
  @IsString()
  employeeId: string;

  @ApiProperty({ example: '1104', description: '4-digit PIN' })
  @IsString()
  @Length(4, 4, { message: 'PIN must be exactly 4 digits' })
  @Matches(/^\d{4}$/, { message: 'PIN must contain only digits' })
  pin: string;
}
