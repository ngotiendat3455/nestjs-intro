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
import { MenuMasterService } from './menu-master.service';

@Controller('menuMaster')
export class MenuMasterController {
  constructor(
    private readonly service: MenuMasterService,
  ) { }

  // List for menu list page
  @Get()
  list(
    @Query('keyWord') keyWord?: string,
    @Query('targetDate') targetDate?: string,
  ) {
    return this.service.list({
      keyWord,
      targetDate,
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
    @Query('itemSectionIDs') ids: string | string[],
  ) {
    const list = Array.isArray(ids)
      ? ids
      : ids
        ? [ids]
        : [];
    return this.service.deleteMany(list);
  }
}

