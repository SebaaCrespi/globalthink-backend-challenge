import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Profile, ProfileSchema } from './profile.schema';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true, index: true })
  email!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ required: true, type: String, enum: UserRole, default: UserRole.USER })
  role!: UserRole;

  @Prop({ type: ProfileSchema, required: true })
  profile!: Profile;
}

export const UserSchema = SchemaFactory.createForClass(User);
