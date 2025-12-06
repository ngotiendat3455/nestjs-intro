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
import { ContractOptionGroupMst } from './menu-classification.entity';
import { ContractMenuMst } from './menu-master.entity';

/**
 * AccountingDetailOption (会計明細・オプション)
 *
 * Option menu detail for a slip line.
 *
 * Legacy columns (conceptual):
 *  - accounting_slip_id (FK)
 *  - detail_number
 *  - company_code
 *  - contract_option_group_mst_id / name
 *  - contract_menu_mst_id / name
 */
@Entity('accounting_detail_options')
export class AccountingDetailOption {
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

  @ManyToOne(() => ContractOptionGroupMst, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contractOptionGroupMstId' })
  contractOptionGroup?: ContractOptionGroupMst | null;

  @Column({ type: 'uuid', nullable: true })
  contractOptionGroupMstId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractOptionGroupName?: string | null;

  @ManyToOne(() => ContractMenuMst, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contractMenuMstId' })
  contractMenu?: ContractMenuMst | null;

  @Column({ type: 'uuid', nullable: true })
  contractMenuMstId?: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  contractMenuName?: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

