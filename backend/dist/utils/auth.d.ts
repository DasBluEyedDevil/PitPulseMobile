import { JWTPayload } from '../types';
export declare class AuthUtils {
    /**
     * Hash a password using bcrypt
     */
    static hashPassword(password: string): Promise<string>;
    /**
     * Compare a plain password with a hashed password
     */
    static comparePassword(password: string, hashedPassword: string): Promise<boolean>;
    /**
     * Generate a JWT token for a user
     */
    static generateToken(payload: JWTPayload): string;
    /**
     * Verify and decode a JWT token
     */
    static verifyToken(token: string): JWTPayload | null;
    /**
     * Extract token from Authorization header
     */
    static extractTokenFromHeader(authHeader?: string): string | null;
    /**
     * Validate password strength
     */
    static validatePassword(password: string): {
        isValid: boolean;
        errors: string[];
    };
    /**
     * Validate email format
     */
    static validateEmail(email: string): boolean;
    /**
     * Validate username format
     */
    static validateUsername(username: string): {
        isValid: boolean;
        errors: string[];
    };
}
//# sourceMappingURL=auth.d.ts.map