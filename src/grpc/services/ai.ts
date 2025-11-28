import * as grpc from '@grpc/grpc-js';
import { AiServiceHandlers } from '../../protos/cropfresh/ai/AiService';
import { Logger } from 'pino';

export const aiServiceHandlers = (logger: Logger): AiServiceHandlers => ({
  PredictPrice: (call, callback) => {
    logger.info('PredictPrice called');
    callback(null, { price: 100, confidence: 0.9 });
  },
  GradeQuality: (call, callback) => {
    logger.info('GradeQuality called');
    callback(null, { grade: 'A', confidence: 0.95 });
  },
  MatchBuyer: (call, callback) => {
    logger.info('MatchBuyer called');
    callback(null, { buyerIds: ['buyer-1'], scores: [0.9] });
  }
});
