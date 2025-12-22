// Tracing (Must be first)
import './tracing';

import { GrpcServer } from './grpc/server';
import { aiServiceHandlers } from './grpc/services/ai';
import { photoValidationGrpcHandlers } from './grpc/services/photo-validation';
import path from 'path';
import express from 'express';
import { logger } from './utils/logger';
import { requestLogger, traceIdMiddleware } from './middleware/logging';
import { monitoringMiddleware, metricsHandler } from './middleware/monitoring';
import { prisma } from './lib/prisma';
import { livenessHandler, createReadinessHandler } from './middleware/health';

const app = express();
// PrismaClient is now initialized in lib/prisma.ts with Prisma 7 driver adapter

const PORT = process.env.PORT || 3006;
const SERVICE_NAME = 'AI Orchestration Service';

// Middleware
app.use(express.json());
app.use(monitoringMiddleware);
app.use(traceIdMiddleware);
app.use(requestLogger);

// Health check endpoints (Kubernetes probes)
app.get('/health', livenessHandler);
app.get('/ready', createReadinessHandler(prisma));

// Metrics Endpoint
app.get('/metrics', metricsHandler);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: `CropFresh `,
    version: '0.1.0'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(` running on port `);
});

export default app;

// gRPC Server Setup
const GRPC_PORT = parseInt(process.env.GRPC_PORT || '50051', 10);
const PROTO_PATH = path.join(__dirname, '../protos/proto/ai.proto');
const PACKAGE_NAME = 'cropfresh.ai';

(async () => {
  try {
    const grpcServer = new GrpcServer(GRPC_PORT, logger);
    const packageDef = grpcServer.loadProto(PROTO_PATH);
    const proto = packageDef.cropfresh.ai as any;

    // Register AIService handlers
    const aiServiceDef = proto['AIService'].service;
    grpcServer.addService(aiServiceDef, aiServiceHandlers(logger));

    // Register PhotoValidationService handlers (Story 3.2)
    const photoValidationServiceDef = proto['PhotoValidationService'].service;
    grpcServer.addService(photoValidationServiceDef, photoValidationGrpcHandlers(logger));

    await grpcServer.start();
    logger.info('Registered services: AIService, PhotoValidationService');
  } catch (err) {
    logger.error(err, 'Failed to start gRPC server');
  }
})();
