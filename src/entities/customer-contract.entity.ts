import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn, VersionColumn } from 'typeorm';
import { Customer } from './customer.entity';

export enum ContractStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  TERMINATED = 'TERMINATED',
}

@Entity('customer_contracts')
export class CustomerContract {
  @PrimaryGeneratedColumn('uuid')
  contractId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer!: Customer;

  @Column({ type: 'varchar', length: 64, nullable: true })
  contractCode?: string | null;

  @Column({ type: 'date' })
  startDate: string | Date;

  @Column({ type: 'date', nullable: true })
  endDate?: string | Date | null;

  @Column({ type: 'enum', enum: ContractStatusEnum, default: ContractStatusEnum.ACTIVE })
  status: ContractStatusEnum;

  @Column({ type: 'boolean', default: false })
  autoRenew: boolean;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

