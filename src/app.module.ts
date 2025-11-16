import { Module } from '@nestjs/common';
import { TypeOrmModule } from "@nestjs/typeorm";
import { Org, Role, Staff, RoleDetail, Customer, CustomerContact, CustomerAddress, CustomerContract } from './entities';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrgMasterModule } from './org-master/org-master.module';
import { RoleMasterModule } from './role-master/role-master.module';
import { StaffMasterModule } from './staff-master/staff-master.module';
import { CustomerModule } from './customer/customer.module';
import { UsersModule } from './users/users.module';
@Module({
  imports: [
    UsersModule,
    OrgMasterModule,
    StaffMasterModule,
    AuthModule,
    CustomerModule,
    RoleMasterModule,
    TypeOrmModule.forRootAsync({
      useFactory: async () => ({
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        username: 'postgres',
        password: '123456',
        database: 'nestjs-blog',
        synchronize: true,
        entities: [Org, Role, Staff, RoleDetail, Customer, CustomerContact, CustomerAddress, CustomerContract],
      }),
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
