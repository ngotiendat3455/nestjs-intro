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
import { ProductDepartment } from './product-department.entity';
import { ProductItem } from './product-item.entity';

/**
 * AccountingDetailItem (会計明細・商品)
 *
 * Product item detail for a slip line.
 *
 * Legacy columns (conceptual):
 *  - accounting_slip_id (FK)
 *  - detail_number
 *  - company_code
 *  - item_section_id / name
 *  - item_id / name
 */
@Entity('accounting_detail_items')
export class AccountingDetailItem {
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

  @ManyToOne(() => ProductDepartment, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'itemSectionId' })
  itemSection?: ProductDepartment | null;

  @Column({ type: 'uuid', nullable: true })
  itemSectionId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  itemSectionName?: string | null;

  @ManyToOne(() => ProductItem, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'itemId' })
  item?: ProductItem | null;

  @Column({ type: 'uuid', nullable: true })
  itemId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  itemName?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

