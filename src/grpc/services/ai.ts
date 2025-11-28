import * as grpc from '@grpc/grpc-js';
import { AIServiceHandlers } from '../../protos/cropfresh/ai/AIService';
import { Logger } from 'pino';

export const aiServiceHandlers = (logger: Logger): AIServiceHandlers => ({
  GradeQuality: (call, callback) => {
    logger.info('GradeQuality called');
    callback(null, {
      grade: 'A',
      confidenceScore: 0.95,
      qualityIssues: [],
      suggestedPriceRange: '100-120'
    });
  },
  PredictShelfLife: (call, callback) => {
    logger.info('PredictShelfLife called');
    callback(null, {
      estimatedDays: 7,
      confidenceScore: 0.9,
      storageRecommendation: 'Cool dry place'
    });
  },
  MatchBuyer: (call, callback) => {
    logger.info('MatchBuyer called');
    callback(null, {
      buyerIds: ['buyer-1'],
      matchScores: [0.95],
      recommendedPrice: '110'
    });
  },
  OptimizePrice: (call, callback) => {
    logger.info('OptimizePrice called');
    callback(null, {
      suggestedPricePerKg: 110,
      minPrice: 100,
      maxPrice: 120,
      marketTrend: 'stable'
    });
  }
});
