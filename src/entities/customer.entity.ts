import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { CustomerContact } from './customer-contact.entity';
import { CustomerAddress } from './customer-address.entity';
import { CustomerContract } from './customer-contract.entity';

export enum CustomerStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  customerCode: string;

  @Column({ type: 'varchar', length: 255 })
  customerName: string;

  @Column({ type: 'enum', enum: CustomerStatusEnum, default: CustomerStatusEnum.ACTIVE })
  status: CustomerStatusEnum;

  @Column({ type: 'varchar', length: 128, nullable: true })
  industry?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  taxCode?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[] | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ type: 'int', nullable: true })
  paymentTermDays?: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  creditLimit?: string | null;

  @Column({ type: 'uuid', nullable: true })
  defaultBillingAddressId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  defaultShippingAddressId?: string | null;

  @OneToMany(() => CustomerContact, (c) => c.customer)
  contacts?: CustomerContact[];

  @OneToMany(() => CustomerAddress, (a) => a.customer)
  addresses?: CustomerAddress[];

  @OneToMany(() => CustomerContract, (ct) => ct.customer)
  contracts?: CustomerContract[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

