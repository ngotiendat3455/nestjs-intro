import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Org } from './org.entity';

/**
 * CashierStoreSetting
 *
 * Per-org POS cashier setting.
 * Frontend fields:
 *  - orgId
 *  - receiptPrinterIp
 *  - receiptPrinterPort
 */
@Entity('cashier_store_settings')
@Unique('uq_cashier_store_setting_org', ['org'])
export class CashierStoreSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Org, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orgId' })
  org: Org;

  @Column({ type: 'varchar', length: 64, nullable: true })
  receiptPrinterIp: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  receiptPrinterPort: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

