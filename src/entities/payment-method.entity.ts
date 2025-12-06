import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { PaymentMethodOrg } from './payment-method-org.entity';

/**
 * Accounting classification for a payment method.
 *
 * Mirrors FE constant `CASH_OR_NOT_CASH`:
 *  - 0: 現金 (cash)
 *  - 1: 現金外 (non‑cash: card, e-money, etc.)
 */
export enum PaymentAccountingType {
  CASH = 0,
  NON_CASH = 1,
}

/**
 * Change / 釣銭 handling.
 *
 * Mirrors FE constant `RETURN_CASH`:
 *  - 0: 釣銭を出す (change is given)
 *  - 1: 釣銭なし or special handling
 */
export enum PaymentChangeType {
  PROVIDE_CHANGE = 0,
  NO_CHANGE = 1,
}

/**
 * Generic "input required" flag used for several fields.
 *
 * Mirrors FE constant `NEED_INPUT_NONEED`:
 *  - 0: 入力不要 (no input)
 *  - 1: 入力必須 (required)
 *  - 2: 自動 or system‑driven
 */
export enum PaymentInputRequirement {
  NONE = 0,
  REQUIRED = 1,
  AUTO = 2,
}

/**
 * Payment method master (POS 支払方法マスタ).
 *
 * FE field names (example):
 *  - paymentId
 *  - companyCode
 *  - paymentCode
 *  - paymentName
 *  - accounting           (CASH_OR_NOT_CASH enum: 0 現金 / 1 現金外)
 *  - hanging              (RETURN_CASH enum: 0 釣銭あり / 1 釣銭なし 等)
 *  - processNumber        (NEED_INPUT_NONEED: 処理番号を会計時に入力を)
 *  - moneyScheduleReceipt (NEED_INPUT_NONEED: 入金予定日を会計時に入力を)
 *  - creditCard           (NEED_INPUT_NONEED: カード会社を会計時に入力を)
 *  - frequency            (NEED_INPUT_NONEED: 回数を会計時に入力を)
 *  - deleted
 *  - applyStartDate
 *  - applyEndDate
 */
@Entity('payment_methods')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  paymentId: string;

  /**
   * Logical tenant key (aligns with Org.companyCode).
   *
   * FE field: companyCode
   */
  @Column({ type: 'varchar', length: 32, nullable: true })
  companyCode?: string | null;

  /**
   * Payment method code (unique within a company).
   *
   * FE field: paymentCode
   */
  @Column({ type: 'varchar', length: 32 })
  paymentCode: string;

  /**
   * Payment method name shown on POS.
   *
   * FE field: paymentName
   */
  @Column({ type: 'varchar', length: 255 })
  paymentName: string;

  /**
   * Accounting classification: cash vs non‑cash.
   *
   * FE enum: CASH_OR_NOT_CASH
   *  - 0: 現金
   *  - 1: 現金外
   */
  @Column({ type: 'int', default: PaymentAccountingType.CASH })
  accounting: PaymentAccountingType;

  /**
   * Change / 釣銭 handling for this method.
   *
   * FE enum: RETURN_CASH
   */
  @Column({ type: 'int', default: PaymentChangeType.PROVIDE_CHANGE })
  hanging: PaymentChangeType;

  /**
   * Whether a process/authorization number must be entered at checkout.
   *
   * FE enum: NEED_INPUT_NONEED
   */
  @Column({ type: 'int', default: PaymentInputRequirement.NONE })
  processNumber: PaymentInputRequirement;

  /**
   * Whether an expected deposit date (入金予定日) must be entered.
   *
   * FE enum: NEED_INPUT_NONEED
   */
  @Column({ type: 'int', default: PaymentInputRequirement.NONE })
  moneyScheduleReceipt: PaymentInputRequirement;

  /**
   * Whether card company must be specified at checkout.
   *
   * FE enum: NEED_INPUT_NONEED
   */
  @Column({ type: 'int', default: PaymentInputRequirement.NONE })
  creditCard: PaymentInputRequirement;

  /**
   * Whether payment frequency / installments (回数) must be entered.
   *
   * FE enum: NEED_INPUT_NONEED
   */
  @Column({ type: 'int', default: PaymentInputRequirement.NONE })
  frequency: PaymentInputRequirement;

  /**
   * Effective period (start).
   *
   * FE field: applyStartDate (YYYY-MM-DD)
   */
  @Column({ type: 'date' })
  applyStartDate: string | Date;

  /**
   * Effective period (end). Null means "no upper bound".
   *
   * FE field: applyEndDate
   */
  @Column({ type: 'date', nullable: true })
  applyEndDate?: string | Date | null;

  /**
   * Logical delete flag to mirror FE "deleted" field.
   */
  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;

  /**
   * Organisations / stores where this payment method is applicable.
   *
   * Bridged via PaymentMethodOrg.
   */
  @OneToMany(() => PaymentMethodOrg, (bridge) => bridge.paymentMethod)
  orgs: PaymentMethodOrg[];
}

