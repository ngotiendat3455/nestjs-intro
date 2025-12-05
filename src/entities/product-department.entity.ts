import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * Product department (商品部門)
 *
 * This corresponds roughly to the ProductDepartment screen.
 * FE type: IProductlistData
 *
 * Fields:
 *  - itemSectionId       : PK
 *  - displaySort         : 表示順
 *  - itemSectionCode     : 部門コード
 *  - itemSectionName     : 部門名称
 *  - taxRateType         : 0 (NORMAL) | 1 (REDUCED_TAX_RATE) ...
 *  - effective           : true=有効 / false=無効
 */
@Entity('product_departments')
export class ProductDepartment {
  @PrimaryGeneratedColumn('uuid')
  itemSectionId: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  companyCode: string | null;

  @Column({ type: 'int', default: 0 })
  displaySort: number;

  @Column({ type: 'varchar', length: 32 })
  itemSectionCode: string;

  @Column({ type: 'varchar', length: 255 })
  itemSectionName: string;

  // numeric category index used by TaxRate + FE
  @Column({ type: 'int', default: 0 })
  taxRateType: number;

  @Column({ type: 'boolean', default: true })
  effective: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

