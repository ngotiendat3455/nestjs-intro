import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { CardCompanySettingService } from './card-company-setting.service';

@Controller('cardCompanies')
export class CardCompanySettingController {
  constructor(
    private readonly service: CardCompanySettingService,
  ) { }

  // List card company settings
  @Get()
  list(
    @Query('orgID') orgID?: string,
    @Query('isApplyUnderOrg') isApplyUnderOrg?: string,
    @Query('targetDate') targetDate?: string,
  ) {
    return this.service.list({
      orgID,
      isApplyUnderOrg: isApplyUnderOrg === 'true' || isApplyUnderOrg === '1',
      targetDate,
    });
  }

  // Detail for edit screen
  @Get(':creditId')
  detail(
    @Param('creditId') creditId: string,
    @Query('applyDate') applyDate?: string,
  ) {
    return this.service.getDetail(creditId, applyDate);
  }

  /**
   * Upsert endpoint for add / edit:
   * - without creditId -> create
   * - with creditId -> update
   */
  @Post()
  upsert(
    @Body() body: any,
  ) {
    return this.service.upsert(body);
  }

  // Delete multiple by creditId
  @Delete()
  deleteMany(
    @Query('creditId') ids: string | string[],
  ) {
    const list = Array.isArray(ids)
      ? ids
      : ids
        ? [ids]
        : [];
    return this.service.deleteMany(list);
  }
}

