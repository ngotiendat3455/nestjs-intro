import { Body, Controller, Get, Param, Put } from '@nestjs/common';
import { ReservationStoreSettingService } from './reservation-store-setting.service';

@Controller('reservationManagement/storeSetting')
export class ReservationStoreSettingController {
  constructor(private readonly service: ReservationStoreSettingService) {}

  @Get(':orgId')
  getForOrg(@Param('orgId') orgId: string) {
    return this.service.getForOrg(orgId);
  }

  @Put(':orgId')
  upsert(@Param('orgId') orgId: string, @Body() body: any) {
    return this.service.upsert(orgId, body);
  }
}

