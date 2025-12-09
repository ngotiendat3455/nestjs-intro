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
import { Customer } from './customer.entity';
import { ContractCourse } from './contract-course.entity';

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

  @Column({ type: 'varchar', length: 64, nullable: true })
  contractNo?: string | null;

  @Column({ type: 'date' })
  startDate: string | Date;

  @Column({ type: 'date', nullable: true })
  endDate?: string | Date | null;

  @Column({ type: 'enum', enum: ContractStatusEnum, default: ContractStatusEnum.ACTIVE })
  status: ContractStatusEnum;

  @Column({ type: 'boolean', default: false })
  autoRenew: boolean;

  /**
   * Link to contract course master (コースマスタ).
   */
  @ManyToOne(() => ContractCourse, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contractCourseMstId' })
  contractCourse?: ContractCourse | null;

  @Column({ type: 'uuid', nullable: true })
  contractCourseMstId?: string | null;

  /**
   * Total ticket count purchased for this contract.
   */
  @Column({ type: 'int', default: 0 })
  totalNum: number;

  /**
   * Number of tickets already used.
   */
  @Column({ type: 'int', default: 0 })
  usedNum: number;

  /**
   * Total contract price (tax included).
   */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  totalPrice: number | string;

  /**
   * Discount rate applied to this contract (0-100).
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  discountRate: number | string;

  /**
   * Per-ticket price after discount.
   */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  discountPrice: number | string;

  /**
   * Manual price adjustment for the full contract (e.g. correction).
   */
  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  adjustPrice: number | string;

  /**
   * Expiration date of the contract course.
   */
  @Column({ type: 'date', nullable: true })
  expirationDate?: string | Date | null;

  /**
   * Extension date (optional) if the contract is extended.
   */
  @Column({ type: 'date', nullable: true })
  extensionDate?: string | Date | null;

  /**
   * Optional cancellation identifier.
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  cancelId?: string | null;

  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
