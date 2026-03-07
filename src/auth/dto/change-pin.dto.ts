import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, Matches } from 'class-validator';

export class ChangePinDto {
  @ApiProperty({ example: '1104', description: 'Current PIN (or one-time PIN)' })
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  currentPin: string;

  @ApiProperty({ example: '5678', description: 'New 4-digit PIN' })
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/)
  newPin: string;
}
