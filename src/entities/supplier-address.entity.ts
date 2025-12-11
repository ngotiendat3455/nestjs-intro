import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Supplier } from './supplier.entity';

export enum SupplierAddressTypeEnum {
  BILLING = 'BILLING',
  SHIPPING = 'SHIPPING',
  OFFICE = 'OFFICE',
  WAREHOUSE = 'WAREHOUSE',
}

@Entity('supplier_addresses')
export class SupplierAddress {
  @PrimaryGeneratedColumn('uuid')
  addressId: string;

  @ManyToOne(() => Supplier, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'supplierId' })
  supplier!: Supplier;

  @Column({ type: 'enum', enum: SupplierAddressTypeEnum })
  type: SupplierAddressTypeEnum;

  @Column({ type: 'varchar', length: 16, nullable: true })
  postalCode?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  prefecture?: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  city?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  street?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  building?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  country?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
