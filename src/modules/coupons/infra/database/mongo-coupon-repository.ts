import type { Collection, Db } from 'mongodb';
import { Coupon } from '../../domain/coupon';
import type { CouponRepository } from '../../domain/coupon-repository';

interface CouponDocument {
  _id: string;
  discountPercent: number;
  expiresAt: Date;
  redeemedBy: string[];
  createdAt: Date;
}

export const CouponMapper = {
  toDomain(doc: CouponDocument): Coupon {
    return Coupon.restore({
      code: doc._id,
      discountPercent: doc.discountPercent,
      expiresAt: doc.expiresAt,
      redeemedBy: doc.redeemedBy ?? [],
      createdAt: doc.createdAt,
    });
  },
  toPersistence(coupon: Coupon): CouponDocument {
    const { code, discountPercent, expiresAt, redeemedBy, createdAt } = coupon.snapshot();
    return { _id: code, discountPercent, expiresAt, redeemedBy, createdAt };
  },
};

export class MongoCouponRepository implements CouponRepository {
  private readonly collection: Collection<CouponDocument>;

  constructor(db: Db) {
    this.collection = db.collection<CouponDocument>('coupons');
  }

  async save(coupon: Coupon): Promise<void> {
    const doc = CouponMapper.toPersistence(coupon);
    await this.collection.replaceOne({ _id: doc._id }, doc, { upsert: true });
  }

  async findByCode(code: string): Promise<Coupon | null> {
    const doc = await this.collection.findOne({ _id: code });
    return doc ? CouponMapper.toDomain(doc) : null;
  }

  async findAll(): Promise<Coupon[]> {
    const docs = await this.collection.find({}).sort({ createdAt: -1 }).toArray();
    return docs.map((doc) => CouponMapper.toDomain(doc));
  }
}
