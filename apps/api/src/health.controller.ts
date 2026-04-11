import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', app: 'PopStack API', time: new Date().toISOString() };
  }
}
