import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {
    // Esto es simplemente para que no rompa la build (cuando se trabaje en este modulo se puede elminar)
    this.logger.log(`Model initialized: ${!!this.userModel}`);
  }
}
