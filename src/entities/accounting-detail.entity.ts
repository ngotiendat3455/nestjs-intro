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

/**
 * AccountingDetail (会計明細)
 *
 * Line‑item detail for an AccountingSlip.
 *
 * This entity roughly mirrors the legacy table:
 *  - accounting_slip_id (FK)
 *  - detail_number
 *  - company_code
 *  - accounting_type
 *  - accounting_category_id / name
 *  - unit_price / amount
 *  - discount_id / discount_amount
 *  - use_points
 *  - including_tax_total_amount / tax_excluded_total_amount
 *  - reduced_tax_rate_flag / tax_rate / tax_amount
 *  - earned_point_id / name / points
 *  - detail_staff_id / name
 */
@Entity('accounting_details')
export class AccountingDetail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Owning slip.
   *
   * DB column: accounting_slip_id
   */
  @ManyToOne(() => AccountingSlip, (slip) => slip.details, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'accountingSlipID' })
  slip: AccountingSlip;

  @Column({ type: 'uuid' })
  accountingSlipID: string;

  /**
   * Detail line sequence within the slip.
   *
   * DB column: detail_number
   */
  @Column({ type: 'int' })
  detailNumber: number;

  /**
   * Logical tenant key.
   *
   * DB column: company_code
   */
  @Column({ type: 'varchar', length: 32, nullable: true })
  companyCode?: string | null;

  /**
   * Accounting type for this line.
   *
   * Examples (from FE): NORMAL / CORRECTION / RETURN / CONTRACT / TICKET
   *
   * DB column: accounting_type
   */
  @Column({ type: 'varchar', length: 32 })
  accountingType: string;

  /**
   * FK to accounting category master.
   *
   * DB column: accounting_category_id
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  accountingCategoryId?: string | null;

  /**
   * Denormalised accounting category name.
   *
   * DB column: accounting_category_name
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  accountingCategoryName?: string | null;

  /**
   * Unit price for this line.
   *
   * DB column: unit_price
   */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  unitPrice: number;

  /**
   * Quantity.
   *
   * DB column: amount
   */
  @Column({ type: 'int', default: 0 })
  amount: number;

  /**
   * Discount master ID.
   *
   * DB column: discount_id
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  discountId?: string | null;

  /**
   * Discount amount applied to this line.
   *
   * DB column: discount_amount
   */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountAmount: number;

  /**
   * Points consumed on this line.
   *
   * DB column: use_points
   */
  @Column({ type: 'int', default: 0 })
  usePoints: number;

  /**
   * Total including tax.
   *
   * DB column: including_tax_total_amount
   */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  includingTaxTotalAmount: number;

  /**
   * Total excluding tax.
   *
   * DB column: tax_excluded_total_amount
   */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxExcludedTotalAmount: number;

  /**
   * Reduced tax rate flag.
   *
   * DB column: reduced_tax_rate_flag
   */
  @Column({ type: 'boolean', default: false })
  reducedTaxRateFlag: boolean;

  /**
   * Tax rate percentage (e.g. 10 => 10%).
   *
   * DB column: tax_rate
   */
  @Column({ type: 'int', default: 0 })
  taxRate: number;

  /**
   * Tax amount for this line.
   *
   * DB column: tax_amount
   */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  taxAmount: number;

  /**
   * Earned point master ID.
   *
   * DB column: earned_point_id
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  earnedPointId?: string | null;

  /**
   * Denormalised earned point name.
   *
   * DB column: earned_point_name
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  earnedPointName?: string | null;

  /**
   * Points earned on this line.
   *
   * DB column: earned_points
   */
  @Column({ type: 'int', default: 0 })
  earnedPoints: number;

  /**
   * Detail staff ID and name (denormalised).
   *
   * DB columns: detail_staff_id, detail_staff_name
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  detailStaffId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  detailStaffName?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

