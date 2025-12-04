import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * Tax rate setting master
 * FE fields (ITaxData):
 *  - taxId
 *  - taxRateType
 *  - taxRate
 *  - taxationUnit
 *  - round
 *  - applyStartDate
 */
@Entity('tax_rates')
export class TaxRate {
  @PrimaryGeneratedColumn('uuid')
  taxId: string;

  // 0,1,2 ... see taxCategoryArr on FE
  @Column({ type: 'int' })
  taxRateType: number;

  // percentage (e.g. 10 => 10%)
  @Column({ type: 'int' })
  taxRate: number;

  // 0,1,2 ... see taxationUnitArr on FE
  @Column({ type: 'int' })
  taxationUnit: number;

  // 0,1,2 ... see roundArr on FE
  @Column({ type: 'int' })
  round: number;

  @Column({ type: 'date' })
  applyStartDate: string | Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

