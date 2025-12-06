import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Org } from './org.entity';
import { Customer } from './customer.entity';
import { Staff } from './staff.entity';
import { AccountingDetail } from './accounting-detail.entity';
import { AccountingDetailContract } from './accounting-detail-contract.entity';
import { AccountingDetailOption } from './accounting-detail-option.entity';
import { AccountingDetailItem } from './accounting-detail-item.entity';
import { AccountingPayment } from './accounting-payment.entity';

/**
 * AccountingSlip
 *
 * Simplified POS accounting slip header.
 *
 * Design goals:
 * - Persist raw frontend payload as JSON (`payload`) so we don't need
 *   to perfectly reconstruct the legacy Java backend model.
 * - Expose a stable `accountingSlipID` identifier that matches the
 *   naming used by the old React frontend.
 * - Add a few indexed columns (`businessDay`, `slipType`, `companyCode`)
 *   to support daily statistics endpoints.
 */
@Entity('accounting_slips')
export class AccountingSlip {
  /**
   * Primary key, exposed to FE as `accountingSlipID`.
   */
  @PrimaryGeneratedColumn('uuid')
  accountingSlipID: string;

  /**
   * Owning organisation.
   *
   * FE field: orgId / orgID
   */
  @ManyToOne(() => Org, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orgId' })
  org?: Org | null;

  /**
   * Company code (tenant key).
   *
   * FE field: companyCode
   */
  @Column({ type: 'varchar', length: 32, nullable: true })
  companyCode?: string | null;

  /**
   * Denormalised organisation name at slip time.
   *
   * Useful for history reports even if Org name changes later.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  orgName?: string | null;

  /**
   * Customer reference.
   *
   * FE field: customerBasicDataId
   */
  @ManyToOne(() => Customer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerBasicDataId' })
  customer?: Customer | null;

  /**
   * Accounting staff (person in charge).
   *
   * FE field: accountingStaffID
   */
  @ManyToOne(() => Staff, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'accountingStaffId' })
  accountingStaff?: Staff | null;

  /**
   * Denormalised customer name.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  customerName?: string | null;

  /**
   * Denormalised accounting staff name.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  accountingStaffName?: string | null;

  /**
   * Slip type: SAVED / TEMPORARY_SAVED / RETURN ...
   */
  @Column({ type: 'varchar', length: 32 })
  slipType: string;

  /**
   * Human‑visible slip number.
   *
   * The original system has fairly complex numbering; here we simply
   * ensure uniqueness per row and let the service generate a value.
   */
  @Column({ type: 'varchar', length: 64, unique: true })
  slipNumber: string;

  /**
   * Business day (store business date, not necessarily calendar date).
   *
   * Stored as date for easier daily aggregation.
   *
   * FE field: businessDay (YYYY‑MM‑DD or ISO date string).
   */
  @Column({ type: 'date' })
  businessDay: string | Date;

  /**
   * Accounting datetime (when the slip was actually created).
   */
  @Column({ type: 'timestamptz' })
  accountingDatetime: Date;

  /**
   * Totals cached on header for fast reporting.
   *
   * These mirror the fields computed on the frontend in formatDataToSave.
   */

  // including_tax_total_amount
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  includingTaxTotalAmount: number;

  // taxation_target_amount
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxationTargetAmount: number;

  // exemption_target_amount
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  exemptionTargetAmount: number;

  // tax_amount
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxAmount: number;

  // payment_amount
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  paymentAmount: number;

  // disbursement_amount
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  disbursementAmount: number;

  /**
   * Detail lines belonging to this slip.
   */
  @OneToMany(() => AccountingDetail, (detail) => detail.slip)
  details: AccountingDetail[];

  /**
   * Contract‑specific detail records.
   */
  @OneToMany(() => AccountingDetailContract, (detail) => detail.slip)
  contractDetails: AccountingDetailContract[];

  /**
   * Option‑menu detail records.
   */
  @OneToMany(() => AccountingDetailOption, (detail) => detail.slip)
  optionDetails: AccountingDetailOption[];

  /**
   * Product‑item detail records.
   */
  @OneToMany(() => AccountingDetailItem, (detail) => detail.slip)
  itemDetails: AccountingDetailItem[];

  /**
   * Payment breakdown records.
   */
  @OneToMany(() => AccountingPayment, (payment) => payment.slip)
  payments: AccountingPayment[];

  /**
   * Raw payload sent by the frontend when creating/updating the slip.
   *
   * This typically includes:
   *  - accountingDetailContractUsingNewContractCourseRequests
   *  ￼- accountingDetailContractUsingOldContractCourseRequests
   *  - accountingDetailItemRequests
   *  - accountingDetailOptionRequests
   *  - accountingPaymentRequests
   *  - paymentAmount, disbursementAmount, totalHasTax, totalNoTax, taxAmount, note, ...
   */
  @Column({ type: 'jsonb' })
  payload: any;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
