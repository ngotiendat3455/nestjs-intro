import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  CardCompany,
  CardCompanyOrg,
  Org,
} from '../entities';
import { CardCompanySettingController } from './card-company-setting.controller';
import { CardCompanySettingService } from './card-company-setting.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CardCompany,
      CardCompanyOrg,
      Org,
    ]),
  ],
  controllers: [CardCompanySettingController],
  providers: [CardCompanySettingService],
})
export class CardCompanySettingModule { }

