import { IsUUID } from 'class-validator';
export class RefreshDto {
  @IsUUID() userId: string;
}
