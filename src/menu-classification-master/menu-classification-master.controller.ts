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
import { MenuClassificationMasterService } from './menu-classification-master.service';

@Controller('menuClassificationMaster')
export class MenuClassificationMasterController {
  constructor(
    private readonly service: MenuClassificationMasterService,
  ) { }

  @Get()
  list(
    @Query('companyCode') companyCode?: string,
    @Query('keyWord') keyWord?: string,
  ) {
    return this.service.list({
      companyCode,
      keyWord,
    });
  }

  @Post('add')
  add(@Body() body: any) {
    return this.service.add(body);
  }

  @Put('edit/:id')
  edit(
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.edit(id, body);
  }

  @Delete()
  deleteMany(
    @Query('contractOptionGroupMstIds')
    ids: string | string[],
  ) {
    const idList = Array.isArray(ids)
      ? ids
      : ids
        ? [ids]
        : [];
    return this.service.deleteMany(idList);
  }
}

