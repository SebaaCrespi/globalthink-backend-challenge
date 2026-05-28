import { Controller, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly usersService: UsersService) {
    // Esto es simplemente para que no rompa la build (cuando se trabaje en este modulo se puede elminar)
    this.logger.log(`Service injected: ${!!this.usersService}`);
  }
}
