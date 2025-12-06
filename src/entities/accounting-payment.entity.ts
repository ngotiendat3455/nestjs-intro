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
import { AccountingSlip } from './accounting-slip.entity';
import { PaymentMethod } from './payment-method.entity';
import { CardCompany } from './card-company.entity';

/**
 * AccountingPayment (会計支払額)
 *
 * Payment breakdown per slip.
 *
 * Legacy columns (conceptual):
 *  - accounting_slip_id (FK)
 *  - payment_id / payment_name
 *  - company_code
 *  - credit_id / credit_name
 *  - frequency
 *  - payment_amount
 *  - price_change
 *  - use_point
 */
@Entity('accounting_payments')
export class AccountingPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AccountingSlip, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountingSlipID' })
  slip: AccountingSlip;

  @Column({ type: 'uuid' })
  accountingSlipID: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  companyCode?: string | null;

  @ManyToOne(() => PaymentMethod, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'paymentId' })
  paymentMethod?: PaymentMethod | null;

  @Column({ type: 'uuid', nullable: true })
  paymentId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentName?: string | null;

  @ManyToOne(() => CardCompany, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'creditId' })
  cardCompany?: CardCompany | null;

  @Column({ type: 'uuid', nullable: true })
  creditId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  creditName?: string | null;

  @Column({ type: 'int', nullable: true })
  frequency?: number | null;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  paymentAmount: number;

  /**
   * Change amount (if this payment type affects change handling).
   */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  priceChange: number;

  /**
   * Points consumed via this payment (if any).
   */
  @Column({ type: 'int', default: 0 })
  usePoint: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

