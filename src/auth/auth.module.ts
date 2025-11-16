import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { Staff, Role, Org } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Staff, Role, Org])],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}

