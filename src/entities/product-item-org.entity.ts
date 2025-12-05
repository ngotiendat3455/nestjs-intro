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
import { Org } from './org.entity';
import { ProductItem } from './product-item.entity';

/**
 * Mapping between product item and applicable stores (適用店舗).
 *
 * FE field name: orgIDs (array of orgId).
 */
@Entity('product_item_orgs')
export class ProductItemOrg {
  @PrimaryGeneratedColumn('uuid')
  id: string;

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
    name: 'orgID',
    referencedColumnName: 'id',
  })
  org: Org;

  @Column({ type: 'timestamptz', nullable: true })
  applyStartDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  applyEndDate: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}
