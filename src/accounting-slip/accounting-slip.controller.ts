import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { AccountingSlipService } from './accounting-slip.service';

/**
 * Minimal reimplementation of legacy POS accounting slip APIs.
 *
 * Route prefix intentionally matches the original frontend:
 *   /v1/accountingSlips/...
 */
@Controller('v1/accountingSlips')
export class AccountingSlipController {
  constructor(
    private readonly service: AccountingSlipService,
  ) { }

  // POST /v1/accountingSlips
  @Post()
  create(
    @Body() body: any,
  ) {
    return this.service.create(body);
  }

  // PUT /v1/accountingSlips/:id
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.update(id, body);
  }

  // PUT /v1/accountingSlips/history/:id
  // For now we treat "history" update the same as normal update.
  @Put('history/:id')
  updateHistory(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.update(id, body);
  }

  // GET /v1/accountingSlips/:id
  @Get(':id')
  getDetail(
    @Param('id') id: string,
  ) {
    return this.service.getDetail(id);
  }

  // GET /v1/accountingSlips/:id/printing
  @Get(':id/printing')
  getDetailForPrinting(
    @Param('id') id: string,
  ) {
    return this.service.getDetailForPrinting(id);
  }

  // DELETE /v1/accountingSlips/:id/
  @Delete(':id')
  delete(
    @Param('id') id: string,
  ) {
    return this.service.remove(id);
  }

  // POST /v1/accountingSlips/:id/return
  @Post(':id/return')
  markReturn(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.markReturn(id, body);
  }

  // GET /v1/accountingSlips/dailySlipStatistic
  @Get('dailySlipStatistic')
  dailySlipStatistic(
    @Query('companyCode') companyCode?: string,
    @Query('businessDay') businessDay?: string,
    @Query('orgID') orgID?: string,
    @Query('slipNumber') slipNumber?: string,
  ) {
    return this.service.dailySlipStatistic({
      companyCode,
      businessDay,
      orgID,
      slipNumber,
    });
  }

  // GET /v1/accountingSlips/dailyDetailStatistic
  @Get('dailyDetailStatistic')
  dailyDetailStatistic(
    @Query('companyCode') companyCode?: string,
    @Query('businessDay') businessDay?: string,
    @Query('orgID') orgID?: string,
    @Query('slipNumber') slipNumber?: string,
  ) {
    return this.service.dailyDetailStatistic({
      companyCode,
      businessDay,
      orgID,
      slipNumber,
    });
  }

  // NOTE:
  // Endpoints like /v1/accountingSlips/courseMst, /products, /menuMasters
  // are not implemented here because they depend on more detailed business
  // rules. They can be layered on top of existing course / product / menu
  // modules when needed.
}

