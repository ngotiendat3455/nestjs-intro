import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { Discount } from './discount.entity';
import { Org } from './org.entity';

/**
 * Bridge between Discount and Org.
 *
 * One Discount can be applied to many Org.
 */
@Entity('discount_orgs')
export class DiscountOrg {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Discount, (discount) => discount.orgs, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'discountId',
    referencedColumnName: 'discountId',
  })
  discount: Discount;

  @ManyToOne(() => Org, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'orgId',
    referencedColumnName: 'id',
  })
  org: Org;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

