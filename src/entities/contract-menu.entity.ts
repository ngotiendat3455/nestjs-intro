import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ContractCourse } from './contract-course.entity';
import { ContractMenuMst } from './menu-master.entity';

/**
 * Contract menu linking table (契約メニュー).
 *
 * Bridges ContractCourse (contract_course_mst) and ContractMenuMst (contract_menu_mst).
 *
 * Original columns (conceptual):
 *  - contract_menu_id (PK)
 *  - company_code
 *  - contract_course_mst_id (FK)
 *  - menu_id (FK -> contract_menu_mst)
 *  - amount
 *  - sub_total
 */
@Entity('contract_menu')
export class ContractMenu {
  @PrimaryGeneratedColumn('uuid')
  contractMenuId: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  companyCode?: string | null;

  @ManyToOne(() => ContractCourse, (course) => course.contractMenus, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'contractCourseMstId',
    referencedColumnName: 'contractCourseId',
  })
  contractCourse: ContractCourse;

  @ManyToOne(() => ContractMenuMst, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({
    name: 'menuId',
    referencedColumnName: 'contractMenuMstID',
  })
  menuMst: ContractMenuMst;

  @Column({ type: 'int' })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  subTotal: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

