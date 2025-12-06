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
import { ContractOptionGroupMst } from './index';

/**
 * Menu master (contract_menu_mst)
 * - FE field names:
 *   - contractMenuMstID
 *   - contractOptionGroupMstID
 *   - contractCourseGroupMstId
 */
@Entity('contract_menu_mst')
export class ContractMenuMst {
  @PrimaryGeneratedColumn('uuid')
  contractMenuMstID: string;

  @Column({ type: 'int', default: 0 })
  dispSort: number;

  @Column({ type: 'varchar', length: 64 })
  menuCode: string;

  @Column({ type: 'varchar', length: 255 })
  menuName: string;

  @ManyToOne(() => ContractOptionGroupMst, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'contractOptionGroupMstID',
    referencedColumnName: 'contractOptionGroupMstId',
  })
  menuClassification: ContractOptionGroupMst;

  @Column({ type: 'int' })
  unitPrice: number;

  @Column({ type: 'date' })
  applyStartDate: string | Date;

  @Column({ type: 'date' })
  applyEndDate: string | Date;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
