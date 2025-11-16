import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { Customer } from './customer.entity';

export enum AddressTypeEnum {
  BILLING = 'BILLING',
  SHIPPING = 'SHIPPING',
  OFFICE = 'OFFICE',
}

@Entity('customer_addresses')
export class CustomerAddress {
  @PrimaryGeneratedColumn('uuid')
  addressId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @Column({ type: 'enum', enum: AddressTypeEnum })
  type: AddressTypeEnum;

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

  @Column({ type: 'boolean', default: false })
  isDefault: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
