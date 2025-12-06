import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { PaymentMethod } from './payment-method.entity';
import { Org } from './org.entity';

/**
 * Bridge table between PaymentMethod and Org.
 *
 * One payment method definition can apply to multiple orgs (stores).
 */
@Entity('payment_method_orgs')
export class PaymentMethodOrg {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PaymentMethod, (paymentMethod) => paymentMethod.orgs, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'paymentId',
    referencedColumnName: 'paymentId',
  })
  paymentMethod: PaymentMethod;

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

