import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';

@Entity('medias')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  mediaId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  mediaCode: string;

  @Column({ type: 'varchar', length: 255 })
  mediaName: string;

  // Match MEDIA_CATEGORY_GROUP numeric value on FE
  @Column({ type: 'int' })
  mediaCategory: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @VersionColumn()
  version: number;
}

