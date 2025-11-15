import { Module } from '@nestjs/common';
import { TypeOrmModule } from "@nestjs/typeorm";
import { Org, Role, Staff } from './entities';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrgMasterModule } from './org-master/org-master.module';
import { RoleMasterModule } from './role-master/role-master.module';
import { StaffMasterModule } from './staff-master/staff-master.module';
import { UsersModule } from './users/users.module';
@Module({
  imports: [
    UsersModule,
    OrgMasterModule,
    StaffMasterModule,
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
        entities: [Org, Role, Staff],
      }),
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
