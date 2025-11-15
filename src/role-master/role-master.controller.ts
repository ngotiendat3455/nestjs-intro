import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { RoleMasterService } from './role-master.service';

@Controller('roleMaster')
export class RoleMasterController {
  constructor(private readonly service: RoleMasterService) { }

  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE',
    @Query('sortBy') sortBy?: 'roleCode' | 'roleName' | 'updatedAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.service.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      status,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.service.getOne(id);
  }

  @Post('add')
  add(@Body() body: any) {
    return this.service.add(body);
  }

  @Put('edit/:id')
  edit(@Param('id') id: string, @Body() body: any) {
    return this.service.edit(id, body);
  }

  // Permissions
  @Get(':id/permissions')
  getPermissions(@Param('id') id: string) {
    return this.service.getPermissions(id);
  }

  @Get(':id/permissions/:moduleKey')
  getPermissionForModule(@Param('id') id: string, @Param('moduleKey') moduleKey: any) {
    return this.service.getPermissionForModule(id, moduleKey);
  }

  @Put(':id/permissions/:moduleKey')
  upsertPermission(
    @Param('id') id: string,
    @Param('moduleKey') moduleKey: any,
    @Body() body: any,
  ) {
    return this.service.upsertPermission(id, moduleKey, body);
  }
}

