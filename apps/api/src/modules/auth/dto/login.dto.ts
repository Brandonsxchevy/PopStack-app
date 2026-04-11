import { IsEmail, IsString, IsUUID } from 'class-validator';

export class LoginDto {
  @IsEmail() email: string;
  @IsString() password: string;
}

export class RefreshDto {
  @IsUUID() userId: string;
}
