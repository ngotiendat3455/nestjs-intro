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
import { ProductDepartment } from './product-department.entity';
import { ProductItem } from './product-item.entity';
import { Org } from './org.entity';

/**
 * ItemSectionConfig
 *
 * Bridge between:
 *  - ProductDepartment (商品部門)
 *  - ProductItem (商品)
 *  - Org (店舗)
 *
 * Used by ProductDepartment screen for 設定済 / 未設定.
 *
 * FE request objects:
 *  - { dispSort, itemID, itemOrgID }
 */
@Entity('item_section_configs')
export class ItemSectionConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ProductDepartment, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'itemSectionId',
    referencedColumnName: 'itemSectionId',
  })
  productDepartment: ProductDepartment;

  @ManyToOne(() => ProductItem, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'itemID',
    referencedColumnName: 'itemID',
  })
  productItem: ProductItem;

  @ManyToOne(() => Org, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'itemOrgID',
    referencedColumnName: 'id',
  })
  org: Org;

  @Column({ type: 'int', default: 0 })
  dispSort: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

