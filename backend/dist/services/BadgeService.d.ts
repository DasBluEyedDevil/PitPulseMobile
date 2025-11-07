import { Badge, UserBadge } from '../types';
export declare class BadgeService {
    private db;
    /**
     * Get all available badges
     */
    getAllBadges(): Promise<Badge[]>;
    /**
     * Get badges earned by a user
     */
    getUserBadges(userId: string): Promise<UserBadge[]>;
    /**
     * Check and award badges to a user based on their activities
     */
    checkAndAwardBadges(userId: string): Promise<Badge[]>;
    /**
     * Check specific badge type and return badges that should be awarded
     */
    private checkBadgeType;
    /**
     * Award a badge to a user
     */
    private awardBadge;
    /**
     * Get user statistics for badge calculation
     */
    private getUserStats;
    /**
     * Get badge by ID
     */
    getBadgeById(badgeId: string): Promise<Badge | null>;
    /**
     * Get badge leaderboard (users with most badges)
     */
    getBadgeLeaderboard(limit?: number): Promise<Array<{
        user: {
            id: string;
            username: string;
            firstName?: string;
            lastName?: string;
            profileImageUrl?: string;
        };
        badgeCount: number;
        recentBadges: Badge[];
    }>>;
    /**
     * Check if user has specific badge
     */
    userHasBadge(userId: string, badgeId: string): Promise<boolean>;
    /**
     * Get badge progress for a user (how close they are to earning badges)
     */
    getUserBadgeProgress(userId: string): Promise<Array<{
        badge: Badge;
        progress: number;
        isEarned: boolean;
    }>>;
    /**
     * Map database badge row to Badge type
     */
    private mapDbBadgeToBadge;
}
//# sourceMappingURL=BadgeService.d.ts.map