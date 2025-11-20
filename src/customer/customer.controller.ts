import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CustomerService } from './customer.service';

@Controller('customer')
export class CustomerController {
  constructor(private readonly service: CustomerService) { }

  // Customers
  @Get()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
    @Query('status') status?: 'ACTIVE' | 'INACTIVE',
    @Query('industry') industry?: string,
    @Query('tags') tags?: string,
    @Query('contractActiveAt') contractActiveAt?: string,
    @Query('sortBy') sortBy?: 'customerCode' | 'customerName' | 'updatedAt' | 'contractStartDate',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.service.list({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
      status,
      industry,
      tags,
      contractActiveAt,
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

  // Contacts
  @Get(':id/contacts')
  listContacts(@Param('id') id: string) {
    return this.service.listContacts(id);
  }
  @Post(':id/contacts/add')
  addContact(@Param('id') id: string, @Body() body: any) {
    return this.service.addContact(id, body);
  }
  @Put(':id/contacts/edit/:contactId')
  editContact(@Param('id') id: string, @Param('contactId') contactId: string, @Body() body: any) {
    return this.service.editContact(id, contactId, body);
  }

  // Addresses
  @Get(':id/addresses')
  listAddresses(@Param('id') id: string) {
    return this.service.listAddresses(id);
  }
  @Post(':id/addresses/add')
  addAddress(@Param('id') id: string, @Body() body: any) {
    return this.service.addAddress(id, body);
  }
  @Put(':id/addresses/edit/:addressId')
  editAddress(@Param('id') id: string, @Param('addressId') addressId: string, @Body() body: any) {
    return this.service.editAddress(id, addressId, body);
  }

  // Contracts
  @Get(':id/contracts')
  listContracts(
    @Param('id') id: string,
    @Query('status') status?: any,
    @Query('effectiveAt') effectiveAt?: string,
  ) {
    return this.service.listContracts(id, status, effectiveAt);
  }
  @Post(':id/contracts/add')
  addContract(@Param('id') id: string, @Body() body: any) {
    return this.service.addContract(id, body);
  }
  @Put(':id/contracts/edit/:contractId')
  editContract(
    @Param('id') id: string,
    @Param('contractId') contractId: string,
    @Body() body: any,
  ) {
    return this.service.editContract(id, contractId, body);
  }
}

