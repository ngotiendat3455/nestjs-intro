import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { CashierStoreSettingService } from './cashier-store-setting.service';

@Controller('cashierStoreSetting')
export class CashierStoreSettingController {
  constructor(
    private readonly service: CashierStoreSettingService,
  ) { }

  @Get(':orgId')
  getForOrg(
    @Param('orgId') orgId: string,
  ) {
    return this.service.getForOrg(orgId);
  }

  @Post()
  upsert(
    @Body() body: any,
  ) {
    return this.service.upsert(body);
  }
}

