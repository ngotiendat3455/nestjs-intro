import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Org } from './org.entity';

export type NumberFormatScope = 'GLOBAL' | 'ORG';
export type NumberFormatTarget = 'CUSTOMER_NO' | 'MANAGEMENT_NO';

export type ResetPolicy = 'NEVER' | 'DAILY' | 'MONTHLY' | 'YEARLY' | 'FISCAL_YEARLY';

export type PartType = 'SERIAL' | 'DATE' | 'FISCAL_YEAR' | 'ORG_CODE' | 'LITERAL';

export interface SerialOptions {
  digits: number; // 1..12
  resetPolicy: ResetPolicy;
  scope: 'GLOBAL' | 'ORG' | 'FISCAL_YEAR';
  startFrom?: number;
  step?: number;
}
export interface DateOptions {
  format: 'YYYYMMDD' | 'YYMMDD' | 'YYYY-MM' | 'YYYY-MM-DD';
}
export interface FiscalYearOptions {
  style: 'YYYY' | 'YY';
  startMonth: number; // 1..12
}
export interface LiteralOptions {
  value: string; // halfwidth only
}

export interface FormatPart {
  type: PartType;
  options?: SerialOptions | DateOptions | FiscalYearOptions | LiteralOptions | Record<string, any>;
}

@Entity('customer_number_format_settings')
@Unique('uq_cnf_scope_org_target', ['scope', 'org', 'target'])
export class CustomerNumberFormatSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16 })
  scope: NumberFormatScope;

  @ManyToOne(() => Org, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orgId' })
  org?: Org | null;

  @Index()
  @Column({ type: 'varchar', length: 32 })
  target: NumberFormatTarget;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'jsonb' })
  parts: FormatPart[];

  @Column({ type: 'varchar', length: 64, nullable: true })
  joiner?: string | null;

  @Column({ type: 'int', default: 4 })
  fiscalYearStartMonth: number; // default April

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

@Entity('customer_serial_counters')
@Unique('uq_csc_format_context', ['formatSetting', 'contextKey'])
export class CustomerSerialCounter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => CustomerNumberFormatSetting, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'formatSettingId' })
  formatSetting: CustomerNumberFormatSetting;

  @Index()
  @Column({ type: 'varchar', length: 255 })
  contextKey: string;

  @Column({ type: 'int', default: 0 })
  currentValue: number;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('customer_list_display_settings')
@Unique('uq_clds_scope_org', ['scope', 'org'])
export class CustomerListDisplaySetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 16 })
  scope: NumberFormatScope; // GLOBAL | ORG

  @ManyToOne(() => Org, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orgId' })
  org?: Org | null;

  @Column({ type: 'boolean', default: true })
  showCustomerNo: boolean;

  @Column({ type: 'boolean', default: false })
  showManagementNo: boolean;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

