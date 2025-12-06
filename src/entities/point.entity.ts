import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

/**
 * Point setting master for POS HQ screen.
 *
 * Fields roughly mirror FE types:
 *  - pointMstID
 *  - dispOrder
 *  - pointName
 *  - changeRate
 *  - deleted
 */
@Entity('points')
export class Point {
  @PrimaryGeneratedColumn('uuid')
  pointMstID: string;

  // 表示順
  @Column({ type: 'int' })
  dispOrder: number;

  // ポイント名称
  @Column({ type: 'varchar', length: 255 })
  pointName: string;

  // 換金率 (ポイント / 100円) – allow decimal
  @Column({ type: 'float' })
  changeRate: number;

  // FE uses this as an "active" flag via Switch
  @Column({ type: 'boolean', default: false })
  deleted: boolean;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

