import { IsString, IsOptional, IsArray, IsEnum, IsBoolean, IsUrl, MinLength } from 'class-validator';

export class CreateQuestionDto {
  @IsString() @MinLength(5) title: string;
  @IsString() @IsOptional() description?: string;
  @IsArray() @IsOptional() stackTags?: string[];
  @IsEnum(['FIVE', 'TWENTY', 'FIFTY_PLUS']) budgetTier: string;
  @IsEnum(['LOW', 'MEDIUM', 'HIGH']) urgency: string;
  @IsString() @IsOptional() url?: string;
  @IsArray() @IsOptional() screenshotKeys?: string[];
  @IsString() @IsOptional() linkId?: string;
  @IsString() @IsOptional() preSelectedDevId?: string;
  @IsBoolean() @IsOptional() requiresAccess?: boolean;
}
