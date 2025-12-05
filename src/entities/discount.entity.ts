import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { DiscountOrg } from './discount-org.entity';

export enum DiscountType {
  AMOUNT = 0,
  RATE = 1,
}

/**
 * Discount master
 *
 * FE field names (example):
 *  - discountId
 *  - discountCode
 *  - discountName
 *  - discountType
 *  - discountAmount
 *  - discountRate
 *  - usePoint
 *  - origin
 *  - media
 *  - effective
 *  - applyStartDate
 */
@Entity('discounts')
export class Discount {
  @PrimaryGeneratedColumn('uuid')
  discountId: string;

  @Column({ type: 'varchar', length: 32 })
  discountCode: string;

  @Column({ type: 'varchar', length: 255 })
  discountName: string;

  @Column({ type: 'enum', enum: DiscountType })
  discountType: DiscountType;

  @Column({ type: 'int', default: 0 })
  discountAmount: number;

  @Column({ type: 'int', default: 0 })
  discountRate: number;

  @Column({ type: 'boolean', default: false })
  usePoint: boolean;

  // Logical tenant key (align with Org.companyCode).
  @Column({ type: 'varchar', length: 32, nullable: true })
  companyCode?: string | null;

  // Source of discount definition (e.g. SYSTEM / USER).
  @Column({ type: 'varchar', length: 32, nullable: true })
  origin?: string | null;

  // Target media (e.g. POS / EC).
  @Column({ type: 'varchar', length: 32, nullable: true })
  media?: string | null;

  @Column({ type: 'boolean', default: true })
  effective: boolean;

  @Column({ type: 'date' })
  applyStartDate: string | Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;

  @OneToMany(() => DiscountOrg, (discountOrg) => discountOrg.discount)
  orgs: DiscountOrg[];
}

