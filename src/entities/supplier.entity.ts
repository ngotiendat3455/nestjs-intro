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
import { SupplierContact } from './supplier-contact.entity';
import { SupplierAddress } from './supplier-address.entity';

export enum SupplierStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  supplierCode: string;

  @Column({ type: 'varchar', length: 255 })
  supplierName: string;

  @Column({ type: 'enum', enum: SupplierStatusEnum, default: SupplierStatusEnum.ACTIVE })
  status: SupplierStatusEnum;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  phone?: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  fax?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  taxCode?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  website?: string | null;

  @Column({ type: 'int', nullable: true })
  paymentTermDays?: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  creditLimit?: string | null;

  @Column({ type: 'jsonb', nullable: true })
  tags?: string[] | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ type: 'uuid', nullable: true })
  defaultBillingAddressId?: string | null;

  @Column({ type: 'uuid', nullable: true })
  defaultShippingAddressId?: string | null;

  @OneToMany(() => SupplierContact, (c) => c.supplier)
  contacts?: SupplierContact[];

  @OneToMany(() => SupplierAddress, (a) => a.supplier)
  addresses?: SupplierAddress[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
