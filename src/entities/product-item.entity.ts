import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { ProductDepartment } from './product-department.entity';
import { ProductItemOrg } from './product-item-org.entity';

/**
 * Product item (商品)
 *
 * Used by ProductSetting screen.
 * FE type: IProductItemData / form payload.
 */
@Entity('product_items')
export class ProductItem {
  @PrimaryGeneratedColumn('uuid')
  itemID: string;

  @Column({ type: 'varchar', length: 32 })
  itemCode: string;

  @Column({ type: 'varchar', length: 255 })
  itemName: string;

  /**
   * Optional link to ProductDepartment (商品部門).
   */
  @ManyToOne(() => ProductDepartment, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'itemSectionID',
    referencedColumnName: 'itemSectionId',
  })
  productDepartment?: ProductDepartment | null;

  /**
   * Supplier master ID (no explicit relation yet).
   */
  @Column({ type: 'varchar', length: 64, nullable: true })
  supplierMstId: string | null;

  // 原価
  @Column({ type: 'int', default: 0 })
  cost: number;

  // 単価
  @Column({ type: 'int', default: 0 })
  unitPrice: number;

  /**
   * 課税区分
   * true  = 非課税
   * false = 課税
   */
  @Column({ type: 'boolean', default: false })
  taxationSection: boolean;

  @Column({ type: 'timestamptz' })
  applyStartDate: Date;

  @Column({ type: 'timestamptz', nullable: true })
  applyEndDate: Date | null;

  @OneToMany(() => ProductItemOrg, (pio) => pio.productItem)
  orgs: ProductItemOrg[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

