import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * Menu classification master
 * Original FE field names:
 * - contractOptionGroupMstId
 * - companyCode
 * - dispSort
 * - groupCode
 * - groupName
 */
@Entity('contract_option_group_mst')
export class ContractOptionGroupMst {
  @PrimaryGeneratedColumn('uuid')
  contractOptionGroupMstId: string;

  @Column({ type: 'varchar', length: 32 })
  companyCode: string;

  @Column({ type: 'int', default: 0 })
  dispSort: number;

  @Index()
  @Column({ type: 'varchar', length: 64 })
  groupCode: string;

  @Column({ type: 'varchar', length: 255 })
  groupName: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

