/**
 * Photo Validation Service - Business Logic Layer
 * 
 * SITUATION: Photos need quality validation before AI grading
 * TASK: Validate photo quality (brightness, focus, presence of produce)
 * ACTION: Use mock ML model to analyze image and return validation result
 * RESULT: Validation feedback for mobile app to guide user
 * 
 * @module PhotoValidationService
 */

import { mockQualityModel, MockQualityModel, ImageStats, QualityIssueType } from '../models/mock-quality-model';
import { logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface PhotoValidationRequest {
    photoUrl: string;
    width: number;
    height: number;
    // Optional: raw image buffer if available
    imageBuffer?: Buffer;
}

export interface PhotoValidationResult {
    isValid: boolean;
    qualityScore: number; // 0.00 - 1.00
    grade: 'A' | 'B' | 'C' | 'REJECT';
    confidence: number;
    issues: PhotoIssue[];
}

export interface PhotoIssue {
    type: string;
    message: string;
    suggestion: string;
}

// ============================================================================
// Service Class
// ============================================================================

export class PhotoValidationService {
    constructor(private model: MockQualityModel = mockQualityModel) { }

    /**
     * Validate photo quality for produce grading
     * 
     * Analyzes image for:
     * - Resolution (minimum 1024x768)
     * - Brightness (not too dark/bright)
     * - Sharpness (not blurry)
     * - Produce presence (contains produce in frame)
     * 
     * @param request - Photo validation request
     * @returns Validation result with quality score and issues
     */
    async validatePhoto(request: PhotoValidationRequest): Promise<PhotoValidationResult> {
        const startTime = Date.now();

        try {
            // Extract or create image stats
            const stats = await this.getImageStats(request);

            // Run prediction through model
            const prediction = await this.model.predict(stats);

            // Convert to validation result
            const isValid = prediction.grade !== 'REJECT' && prediction.issues.length === 0;
            const qualityScore = this.gradeToScore(prediction.grade);

            const result: PhotoValidationResult = {
                isValid,
                qualityScore,
                grade: prediction.grade,
                confidence: prediction.confidence,
                issues: prediction.issues.map(issue => ({
                    type: issue.type,
                    message: issue.message,
                    suggestion: issue.suggestion,
                })),
            };

            const duration = Date.now() - startTime;
            logger.info(
                {
                    photoUrl: request.photoUrl,
                    isValid,
                    qualityScore,
                    grade: prediction.grade,
                    issueCount: prediction.issues.length,
                    durationMs: duration
                },
                'Photo validation completed'
            );

            return result;

        } catch (error) {
            logger.error({ error, photoUrl: request.photoUrl }, 'Photo validation failed');
            throw error;
        }
    }

    /**
     * Validate image resolution only (quick check)
     * 
     * @param width - Image width
     * @param height - Image height
     * @returns true if meets minimum resolution
     */
    validateResolution(width: number, height: number): boolean {
        return width >= 1024 && height >= 768;
    }

    /**
     * Get validation suggestions for common issues
     * 
     * @param issueType - Type of quality issue
     * @returns Localized suggestion (English, Kannada, Hindi, Tamil, Telugu)
     */
    getSuggestion(issueType: string, language: string = 'en'): string {
        const suggestions: Record<string, Record<string, string>> = {
            [QualityIssueType.TOO_DARK]: {
                en: 'Move to brighter lighting or use flash',
                kn: 'ಹೆಚ್ಚು ಬೆಳಕಿಗೆ ಹೋಗಿ ಅಥವಾ ಫ್ಲಾಶ್ ಬಳಸಿ',
                hi: 'तेज रोशनी में जाएं या फ्लैश का उपयोग करें',
                ta: 'பிரகாசமான வெளிச்சத்திற்கு செல்லவும் அல்லது ஃபிளாஷ் பயன்படுத்தவும்',
                te: 'ప్రకాశవంతమైన వెలుతురులో వెళ్ళండి లేదా ఫ్లాష్ ఉపయోగించండి',
            },
            [QualityIssueType.TOO_BRIGHT]: {
                en: 'Move away from direct sunlight',
                kn: 'ನೇರ ಸೂರ್ಯನ ಬೆಳಕಿನಿಂದ ದೂರ ಹೋಗಿ',
                hi: 'सीधी धूप से दूर हटें',
                ta: 'நேரடி சூரிய ஒளியிலிருந்து விலகி செல்லவும்',
                te: 'ప్రత్యక్ష సూర్యకాంతి నుండి దూరంగా వెళ్ళండి',
            },
            [QualityIssueType.BLURRY]: {
                en: 'Hold camera steady and tap to focus',
                kn: 'ಕ್ಯಾಮೆರಾವನ್ನು ಸ್ಥಿರವಾಗಿ ಹಿಡಿದು ಫೋಕಸ್ ಮಾಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ',
                hi: 'कैमरा स्थिर रखें और फोकस करने के लिए टैप करें',
                ta: 'கேமராவை நிலையாக பிடித்து ஃபோகஸ் செய்ய டேப் செய்யவும்',
                te: 'కెమెరాను స్థిరంగా పట్టుకుని ఫోకస్ చేయడానికి ట్యాప్ చేయండి',
            },
            [QualityIssueType.NO_PRODUCE]: {
                en: 'Ensure produce fills most of the frame',
                kn: 'ಉತ್ಪನ್ನವು ಫ್ರೇಮ್‌ನ ಹೆಚ್ಚಿನ ಭಾಗವನ್ನು ತುಂಬಿರುವುದನ್ನು ಖಚಿತಪಡಿಸಿ',
                hi: 'सुनिश्चित करें कि उपज फ्रेम का अधिकांश हिस्सा भरे',
                ta: 'உற்பத்தி பெரும்பாலான பிரேமை நிரப்புவதை உறுதிசெய்யவும்',
                te: 'ఉత్పత్తి ఫ్రేమ్‌లో ఎక్కువ భాగం నింపుతుందని నిర్ధారించుకోండి',
            },
            [QualityIssueType.LOW_RESOLUTION]: {
                en: 'Move closer or use higher camera resolution',
                kn: 'ಹತ್ತಿರ ಹೋಗಿ ಅಥವಾ ಹೆಚ್ಚಿನ ಕ್ಯಾಮೆರಾ ರೆಸಲ್ಯೂಶನ್ ಬಳಸಿ',
                hi: 'करीब जाएं या उच्च कैमरा रिज़ॉल्यूशन का उपयोग करें',
                ta: 'அருகில் செல்லவும் அல்லது உயர் கேமரா தெளிவுத்திறனைப் பயன்படுத்தவும்',
                te: 'దగ్గరగా వెళ్ళండి లేదా అధిక కెమెరా రిజల్యూషన్ ఉపయోగించండి',
            },
        };

        return suggestions[issueType]?.[language] || suggestions[issueType]?.['en'] || 'Please try again';
    }

    // ============================================================================
    // Private Helpers
    // ============================================================================

    private async getImageStats(request: PhotoValidationRequest): Promise<ImageStats> {
        if (request.imageBuffer) {
            // If we have the buffer, analyze it
            return this.model.extractStats(request.imageBuffer, request.width, request.height);
        }

        // Otherwise, create synthetic stats for testing
        // In production, we would fetch the image from the URL
        return {
            width: request.width,
            height: request.height,
            brightness: 140, // Reasonable default
            contrast: 50,
            sharpness: 180,
            hasProduceColors: true,
        };
    }

    private gradeToScore(grade: 'A' | 'B' | 'C' | 'REJECT'): number {
        const scores: Record<string, number> = {
            'A': 0.95,
            'B': 0.75,
            'C': 0.55,
            'REJECT': 0.25,
        };
        return scores[grade] || 0.5;
    }
}

// Export singleton
export const photoValidationService = new PhotoValidationService();
