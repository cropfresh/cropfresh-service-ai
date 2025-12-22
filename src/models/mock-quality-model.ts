/**
 * Mock Quality Model - Placeholder for ML Model
 * 
 * SITUATION: Real ML model not yet implemented (Story 7.4)
 * TASK: Create mock model with same interface as production model
 * ACTION: Use simple heuristics to simulate quality detection
 * RESULT: Testable interface that can be swapped for real model later
 * 
 * This mock uses basic image statistics instead of real ML inference.
 * Replace with actual TensorFlow/ONNX model in Story 7.4.
 * 
 * @module MockQualityModel
 */

// ============================================================================
// Types
// ============================================================================

export interface QualityPrediction {
    grade: 'A' | 'B' | 'C' | 'REJECT';
    confidence: number; // 0.0 - 1.0
    issues: QualityIssue[];
}

export interface QualityIssue {
    type: QualityIssueType;
    severity: number; // 0.0 - 1.0
    message: string;
    suggestion: string;
}

export enum QualityIssueType {
    TOO_DARK = 'TOO_DARK',
    TOO_BRIGHT = 'TOO_BRIGHT',
    BLURRY = 'BLURRY',
    NO_PRODUCE = 'NO_PRODUCE',
    LOW_RESOLUTION = 'LOW_RESOLUTION',
    POOR_FRAMING = 'POOR_FRAMING',
}

/**
 * Image statistics extracted from photo
 */
export interface ImageStats {
    width: number;
    height: number;
    brightness: number; // 0-255 average
    contrast: number; // 0-255 standard deviation
    sharpness: number; // Laplacian variance (higher = sharper)
    hasProduceColors: boolean; // Green/red/yellow detection
}

// ============================================================================
// Mock Quality Model
// ============================================================================

/**
 * MockQualityModel - Simulates ML-based quality grading
 * 
 * This class provides the same interface as a real ML model would,
 * making it easy to swap implementations later.
 * 
 * Usage:
 *   const model = new MockQualityModel();
 *   const prediction = await model.predict(imageStats);
 */
export class MockQualityModel {
    private readonly MIN_WIDTH = 1024;
    private readonly MIN_HEIGHT = 768;
    private readonly MIN_BRIGHTNESS = 40;  // Too dark threshold
    private readonly MAX_BRIGHTNESS = 220; // Too bright threshold
    private readonly MIN_SHARPNESS = 100;  // Blur threshold
    private readonly MIN_CONTRAST = 30;    // Low contrast threshold

    /**
     * Predict quality grade from image statistics
     * 
     * @param stats - Extracted image statistics
     * @returns Quality prediction with grade, confidence, and issues
     */
    async predict(stats: ImageStats): Promise<QualityPrediction> {
        const issues: QualityIssue[] = [];
        let score = 1.0; // Start with perfect score, deduct for issues

        // Check resolution
        if (stats.width < this.MIN_WIDTH || stats.height < this.MIN_HEIGHT) {
            issues.push({
                type: QualityIssueType.LOW_RESOLUTION,
                severity: 0.5,
                message: `Resolution ${stats.width}x${stats.height} below minimum ${this.MIN_WIDTH}x${this.MIN_HEIGHT}`,
                suggestion: 'Move closer to the produce or use higher camera resolution',
            });
            score -= 0.2;
        }

        // Check brightness
        if (stats.brightness < this.MIN_BRIGHTNESS) {
            const severity = (this.MIN_BRIGHTNESS - stats.brightness) / this.MIN_BRIGHTNESS;
            issues.push({
                type: QualityIssueType.TOO_DARK,
                severity,
                message: 'Photo is too dark for accurate quality assessment',
                suggestion: 'Move to brighter lighting or use flash',
            });
            score -= 0.25 * severity;
        } else if (stats.brightness > this.MAX_BRIGHTNESS) {
            const severity = (stats.brightness - this.MAX_BRIGHTNESS) / (255 - this.MAX_BRIGHTNESS);
            issues.push({
                type: QualityIssueType.TOO_BRIGHT,
                severity,
                message: 'Photo is overexposed (too bright)',
                suggestion: 'Move away from direct sunlight or reduce flash',
            });
            score -= 0.25 * severity;
        }

        // Check sharpness (blur detection)
        if (stats.sharpness < this.MIN_SHARPNESS) {
            const severity = (this.MIN_SHARPNESS - stats.sharpness) / this.MIN_SHARPNESS;
            issues.push({
                type: QualityIssueType.BLURRY,
                severity,
                message: 'Photo is blurry, cannot assess quality accurately',
                suggestion: 'Hold camera steady and ensure produce is in focus',
            });
            score -= 0.3 * severity;
        }

        // Check for produce detection (mock: use color heuristic)
        if (!stats.hasProduceColors) {
            issues.push({
                type: QualityIssueType.NO_PRODUCE,
                severity: 0.8,
                message: 'Cannot detect produce in photo',
                suggestion: 'Ensure produce fills most of the frame',
            });
            score -= 0.4;
        }

        // Clamp score
        score = Math.max(0, Math.min(1, score));

        // Determine grade
        const grade = this.scoreToGrade(score);

        return {
            grade,
            confidence: this.calculateConfidence(stats, issues),
            issues,
        };
    }

    /**
     * Extract image statistics from raw image buffer
     * 
     * In production, this would use sharp or canvas to analyze the image.
     * For mock, we generate plausible statistics.
     */
    async extractStats(imageBuffer: Buffer, width: number, height: number): Promise<ImageStats> {
        // Mock implementation - in production, use sharp or canvas
        // to actually analyze the image pixels

        return {
            width,
            height,
            brightness: this.mockBrightness(imageBuffer),
            contrast: this.mockContrast(imageBuffer),
            sharpness: this.mockSharpness(imageBuffer),
            hasProduceColors: this.mockProduceDetection(imageBuffer),
        };
    }

    // ============================================================================
    // Private Helpers
    // ============================================================================

    private scoreToGrade(score: number): 'A' | 'B' | 'C' | 'REJECT' {
        if (score >= 0.85) return 'A';
        if (score >= 0.65) return 'B';
        if (score >= 0.45) return 'C';
        return 'REJECT';
    }

    private calculateConfidence(stats: ImageStats, issues: QualityIssue[]): number {
        // Higher confidence when image is clear and has few issues
        let confidence = 0.9;

        // Reduce confidence for each issue
        for (const issue of issues) {
            confidence -= 0.1 * issue.severity;
        }

        // Reduce confidence for borderline cases
        if (stats.brightness > 180 || stats.brightness < 60) {
            confidence -= 0.1;
        }

        return Math.max(0.3, Math.min(0.99, confidence));
    }

    // Mock methods - replace with real image analysis in production
    private mockBrightness(buffer: Buffer): number {
        // Simulate analyzing first few bytes as if they were pixels
        if (buffer.length < 100) return 128; // Default middle brightness

        let sum = 0;
        const sampleSize = Math.min(1000, buffer.length);
        for (let i = 0; i < sampleSize; i++) {
            sum += buffer[i];
        }
        return sum / sampleSize;
    }

    private mockContrast(buffer: Buffer): number {
        // Mock standard deviation calculation
        const mean = this.mockBrightness(buffer);
        if (buffer.length < 100) return 50;

        let variance = 0;
        const sampleSize = Math.min(1000, buffer.length);
        for (let i = 0; i < sampleSize; i++) {
            variance += Math.pow(buffer[i] - mean, 2);
        }
        return Math.sqrt(variance / sampleSize);
    }

    private mockSharpness(buffer: Buffer): number {
        // Mock Laplacian variance - in production use actual convolution
        // Higher values = sharper image
        if (buffer.length < 100) return 150;

        // Use contrast as proxy for sharpness
        return this.mockContrast(buffer) * 3;
    }

    private mockProduceDetection(buffer: Buffer): boolean {
        // Mock produce detection - in production use object detection model
        // For now, assume produce is present if image has reasonable size
        return buffer.length > 10000;
    }
}

// Export singleton
export const mockQualityModel = new MockQualityModel();
