import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { TaxRateSettingService } from './tax-rate-setting.service';

@Controller('taxRates')
export class TaxRateSettingController {
  constructor(
    private readonly service: TaxRateSettingService,
  ) { }

  // List tax rate settings
  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('targetDate') targetDate?: string,
  ) {
    return this.service.list({
      keyword,
      targetDate,
    });
  }

  // Detail for edit screen
  @Get(':taxId')
  getDetail(
    @Param('taxId') taxId: string,
  ) {
    return this.service.getDetail(taxId);
  }

  /**
   * Upsert endpoint for add / edit:
   * - without taxId -> create
   * - with taxId -> update
   */
  @Post()
  addOrEdit(
    @Body() body: any,
  ) {
    return this.service.addOrEdit(body);
  }

  // Delete multiple by taxId
  @Delete()
  deleteMany(
    @Query('taxId') ids: string | string[],
  ) {
    const list = Array.isArray(ids)
      ? ids
      : ids
        ? [ids]
        : [];
    return this.service.deleteMany(list);
  }
}

