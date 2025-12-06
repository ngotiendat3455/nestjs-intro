import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { PaymentMethodSettingService } from './payment-method-setting.service';

@Controller('paymentMethods')
export class PaymentMethodSettingController {
  constructor(
    private readonly service: PaymentMethodSettingService,
  ) { }

  /**
   * List payment methods for the HQ screen.
   *
   * Query parameters roughly mirror the legacy FE:
   *  - orgIds: base orgId (string)
   *  - applyForUnderOrg: "true"/"false" (include children)
   *  - applyDate: YYYY-MM-DD (effective date)
   *  - keyWord: optional free word for code/name
   */
  @Get()
  list(
    @Query('orgIds') orgIds?: string,
    @Query('applyForUnderOrg') applyForUnderOrg?: string,
    @Query('applyDate') applyDate?: string,
    @Query('keyWord') keyWord?: string,
  ) {
    return this.service.list({
      orgIds,
      applyForUnderOrg,
      applyDate,
      keyWord,
    });
  }

  /**
   * Upsert endpoint for add / edit:
   * - without paymentId -> create
   * - with paymentId -> update
   *
   * The body shape mirrors the FE form fields.
   */
  @Post()
  upsert(
    @Body() body: any,
  ) {
    return this.service.upsert(body);
  }

  /**
   * Delete links between payment methods and orgs.
   *
   * The request body should be an array of:
   *  { paymentId, orgId, applyStartDate? }
   */
  @Delete()
  deleteMany(
    @Body() body: any[],
  ) {
    return this.service.deleteMany(body);
  }
}

