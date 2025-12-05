import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { DiscountService } from './discount.service';

@Controller('discounts')
export class DiscountController {
  constructor(
    private readonly service: DiscountService,
  ) { }

  @Get()
  list(
    @Query('orgIds') orgIds?: string,
    @Query('targetDate') targetDate?: string,
    @Query('featureCode') featureCode?: string,
    @Query('effiectiveType') effiectiveType?: 'ALL' | 'VALID' | 'INVALID',
    @Query('applyForUnderOrg') applyForUnderOrg?: string,
  ) {
    return this.service.list({
      orgIds,
      targetDate,
      featureCode,
      effiectiveType,
      applyForUnderOrg,
    });
  }

  @Get(':discountId')
  detail(
    @Param('discountId') discountId: string,
    @Query('targetDate') targetDate?: string,
  ) {
    return this.service.getDetail(discountId, targetDate);
  }

  @Post()
  upsert(
    @Body() body: any,
  ) {
    return this.service.upsert(body);
  }
}

