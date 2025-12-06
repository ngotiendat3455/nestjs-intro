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
import { CustomerContract } from './customer-contract.entity';
import { CourseGroup } from './course-group.entity';

/**
 * AccountingDetailContract (会計明細・契約)
 *
 * Contract‑specific detail for a slip line.
 *
 * Legacy columns (conceptual):
 *  - accounting_slip_id (FK)
 *  - detail_number
 *  - company_code
 *  - contract_id (FK)
 *  - contract_name
 *  - contract_course_group_mst_id (FK)
 *  - contract_course_group_name
 *  - customer_basic_data_id / customer_name
 *  - staff_id / staff_name
 *  - tax
 *  - total_price
 *  - ticket_used_num
 */
@Entity('accounting_detail_contracts')
export class AccountingDetailContract {
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

  @Column({ type: 'int' })
  detailNumber: number;

  @Column({ type: 'varchar', length: 32, nullable: true })
  companyCode?: string | null;

  @ManyToOne(() => CustomerContract, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contractId' })
  contract?: CustomerContract | null;

  @Column({ type: 'uuid', nullable: true })
  contractId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractName?: string | null;

  @ManyToOne(() => CourseGroup, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contractCourseGroupMstId' })
  contractCourseGroup?: CourseGroup | null;

  @Column({ type: 'uuid', nullable: true })
  contractCourseGroupMstId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractCourseGroupName?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  customerBasicDataId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  customerName?: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  staffId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  staffName?: string | null;

  /**
   * Total tax amount for this contract detail.
   */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  tax: number;

  /**
   * Total price including tax.
   */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalPrice: number;

  /**
   * Number of tickets used from this contract.
   */
  @Column({ type: 'int', default: 0 })
  ticketUsedNum: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

