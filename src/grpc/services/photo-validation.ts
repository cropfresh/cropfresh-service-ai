/**
 * Photo Validation gRPC Handlers - Story 3.2
 * 
 * SITUATION: Gateway needs to validate photo quality via AI service
 * TASK: Expose photo validation as gRPC service
 * ACTION: Handle gRPC requests, delegate to PhotoValidationService
 * RESULT: Quality validation available to gateway and other services
 * 
 * @module PhotoValidationGrpcHandlers
 */

import { ServerUnaryCall, sendUnaryData, status } from '@grpc/grpc-js';
import { photoValidationService } from '../../services/photo-validation-service';
import type { Logger } from 'pino';

// ============================================================================
// Request/Response Types (from proto)
// ============================================================================

interface ValidatePhotoRequest {
    photoUrl: string;
    width: number;
    height: number;
}

interface ValidationIssue {
    type: string;
    message: string;
    suggestion: string;
}

interface ValidatePhotoResponse {
    isValid: boolean;
    qualityScore: number;
    grade: string;
    confidence: number;
    issues: ValidationIssue[];
}

interface GetSuggestionRequest {
    issueType: string;
    language: string;
}

interface GetSuggestionResponse {
    suggestion: string;
}

// ============================================================================
// Handler Factory
// ============================================================================

export function photoValidationGrpcHandlers(logger: Logger) {
    return {
        /**
         * ValidatePhotoQuality - Validate photo for quality grading
         * 
         * Analyzes brightness, focus, produce presence
         */
        ValidatePhotoQuality(
            call: ServerUnaryCall<ValidatePhotoRequest, ValidatePhotoResponse>,
            callback: sendUnaryData<ValidatePhotoResponse>
        ): void {
            const req = call.request;

            logger.info({ photoUrl: req.photoUrl }, 'Validating photo quality');

            photoValidationService.validatePhoto({
                photoUrl: req.photoUrl,
                width: req.width || 1024,
                height: req.height || 768,
            })
                .then((result) => {
                    callback(null, {
                        isValid: result.isValid,
                        qualityScore: result.qualityScore,
                        grade: result.grade,
                        confidence: result.confidence,
                        issues: result.issues.map(issue => ({
                            type: issue.type,
                            message: issue.message,
                            suggestion: issue.suggestion,
                        })),
                    });
                })
                .catch((error) => {
                    logger.error({ error }, 'Photo validation failed');
                    callback({
                        code: status.INTERNAL,
                        details: error.message || 'Validation failed',
                    }, null);
                });
        },

        /**
         * GetLocalizedSuggestion - Get suggestion text in user's language
         */
        GetLocalizedSuggestion(
            call: ServerUnaryCall<GetSuggestionRequest, GetSuggestionResponse>,
            callback: sendUnaryData<GetSuggestionResponse>
        ): void {
            const req = call.request;

            const suggestion = photoValidationService.getSuggestion(
                req.issueType,
                req.language || 'en'
            );

            callback(null, { suggestion });
        },
    };
}
