"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadgeService = void 0;
const database_1 = __importDefault(require("../config/database"));
class BadgeService {
    constructor() {
        this.db = database_1.default.getInstance();
    }
    /**
     * Get all available badges
     */
    async getAllBadges() {
        const query = `
      SELECT id, name, description, icon_url, badge_type, requirement_value, color, created_at
      FROM badges
      ORDER BY requirement_value ASC, name ASC
    `;
        const result = await this.db.query(query);
        return result.rows.map((row) => this.mapDbBadgeToBadge(row));
    }
    /**
     * Get badges earned by a user
     */
    async getUserBadges(userId) {
        const query = `
      SELECT ub.id, ub.user_id, ub.badge_id, ub.earned_at,
             b.name, b.description, b.icon_url, b.badge_type, b.requirement_value, b.color, b.created_at
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = $1
      ORDER BY ub.earned_at DESC
    `;
        const result = await this.db.query(query, [userId]);
        return result.rows.map((row) => ({
            id: row.id,
            userId: row.user_id,
            badgeId: row.badge_id,
            earnedAt: row.earned_at,
            badge: this.mapDbBadgeToBadge(row),
        }));
    }
    /**
     * Check and award badges to a user based on their activities
     */
    async checkAndAwardBadges(userId) {
        const newBadges = [];
        // Get user's current stats
        const stats = await this.getUserStats(userId);
        // Get user's existing badges
        const existingBadges = await this.getUserBadges(userId);
        const existingBadgeIds = existingBadges.map(ub => ub.badgeId);
        // Check each badge type
        const badgeChecks = [
            { type: 'review_count', count: stats.reviewCount },
            { type: 'venue_explorer', count: stats.uniqueVenuesReviewed },
            { type: 'music_lover', count: stats.uniqueBandsReviewed },
            { type: 'event_attendance', count: stats.reviewsWithEventDate },
            { type: 'helpful_count', count: stats.helpfulVotes },
        ];
        for (const check of badgeChecks) {
            const earnedBadges = await this.checkBadgeType(check.type, check.count, existingBadgeIds);
            for (const badge of earnedBadges) {
                await this.awardBadge(userId, badge.id);
                newBadges.push(badge);
            }
        }
        return newBadges;
    }
    /**
     * Check specific badge type and return badges that should be awarded
     */
    async checkBadgeType(badgeType, userCount, existingBadgeIds) {
        const query = `
      SELECT id, name, description, icon_url, badge_type, requirement_value, color, created_at
      FROM badges
      WHERE badge_type = $1 AND requirement_value <= $2
      ORDER BY requirement_value DESC
    `;
        const result = await this.db.query(query, [badgeType, userCount]);
        const eligibleBadges = result.rows.map((row) => this.mapDbBadgeToBadge(row));
        // Filter out badges the user already has
        return eligibleBadges.filter((badge) => !existingBadgeIds.includes(badge.id));
    }
    /**
     * Award a badge to a user
     */
    async awardBadge(userId, badgeId) {
        const query = `
      INSERT INTO user_badges (user_id, badge_id)
      VALUES ($1, $2)
      ON CONFLICT (user_id, badge_id) DO NOTHING
    `;
        await this.db.query(query, [userId, badgeId]);
    }
    /**
     * Get user statistics for badge calculation
     */
    async getUserStats(userId) {
        const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM reviews WHERE user_id = $1) as review_count,
        (SELECT COUNT(DISTINCT venue_id) FROM reviews WHERE user_id = $1 AND venue_id IS NOT NULL) as unique_venues,
        (SELECT COUNT(DISTINCT band_id) FROM reviews WHERE user_id = $1 AND band_id IS NOT NULL) as unique_bands,
        (SELECT COUNT(*) FROM reviews WHERE user_id = $1 AND event_date IS NOT NULL) as event_reviews,
        (SELECT COALESCE(SUM(helpful_count), 0) FROM reviews WHERE user_id = $1) as helpful_votes
    `;
        const result = await this.db.query(statsQuery, [userId]);
        const stats = result.rows[0];
        return {
            reviewCount: parseInt(stats.review_count) || 0,
            uniqueVenuesReviewed: parseInt(stats.unique_venues) || 0,
            uniqueBandsReviewed: parseInt(stats.unique_bands) || 0,
            reviewsWithEventDate: parseInt(stats.event_reviews) || 0,
            helpfulVotes: parseInt(stats.helpful_votes) || 0,
        };
    }
    /**
     * Get badge by ID
     */
    async getBadgeById(badgeId) {
        const query = `
      SELECT id, name, description, icon_url, badge_type, requirement_value, color, created_at
      FROM badges
      WHERE id = $1
    `;
        const result = await this.db.query(query, [badgeId]);
        if (result.rows.length === 0) {
            return null;
        }
        return this.mapDbBadgeToBadge(result.rows[0]);
    }
    /**
     * Get badge leaderboard (users with most badges)
     */
    async getBadgeLeaderboard(limit = 20) {
        const query = `
      SELECT u.id, u.username, u.first_name, u.last_name, u.profile_image_url,
             COUNT(ub.id) as badge_count
      FROM users u
      LEFT JOIN user_badges ub ON u.id = ub.user_id
      WHERE u.is_active = true
      GROUP BY u.id, u.username, u.first_name, u.last_name, u.profile_image_url
      HAVING COUNT(ub.id) > 0
      ORDER BY badge_count DESC, u.username ASC
      LIMIT $1
    `;
        const result = await this.db.query(query, [limit]);
        const leaderboard = [];
        for (const row of result.rows) {
            // Get recent badges for this user
            const recentBadgesQuery = `
        SELECT b.id, b.name, b.description, b.icon_url, b.badge_type, b.requirement_value, b.color, b.created_at
        FROM user_badges ub
        JOIN badges b ON ub.badge_id = b.id
        WHERE ub.user_id = $1
        ORDER BY ub.earned_at DESC
        LIMIT 3
      `;
            const recentBadgesResult = await this.db.query(recentBadgesQuery, [row.id]);
            const recentBadges = recentBadgesResult.rows.map((badgeRow) => this.mapDbBadgeToBadge(badgeRow));
            leaderboard.push({
                user: {
                    id: row.id,
                    username: row.username,
                    firstName: row.first_name,
                    lastName: row.last_name,
                    profileImageUrl: row.profile_image_url,
                },
                badgeCount: parseInt(row.badge_count),
                recentBadges,
            });
        }
        return leaderboard;
    }
    /**
     * Check if user has specific badge
     */
    async userHasBadge(userId, badgeId) {
        const query = `
      SELECT 1 FROM user_badges
      WHERE user_id = $1 AND badge_id = $2
    `;
        const result = await this.db.query(query, [userId, badgeId]);
        return result.rows.length > 0;
    }
    /**
     * Get badge progress for a user (how close they are to earning badges)
     */
    async getUserBadgeProgress(userId) {
        const stats = await this.getUserStats(userId);
        const userBadges = await this.getUserBadges(userId);
        const earnedBadgeIds = userBadges.map(ub => ub.badgeId);
        const allBadges = await this.getAllBadges();
        return allBadges.map(badge => {
            let currentCount = 0;
            switch (badge.badgeType) {
                case 'review_count':
                    currentCount = stats.reviewCount;
                    break;
                case 'venue_explorer':
                    currentCount = stats.uniqueVenuesReviewed;
                    break;
                case 'music_lover':
                    currentCount = stats.uniqueBandsReviewed;
                    break;
                case 'event_attendance':
                    currentCount = stats.reviewsWithEventDate;
                    break;
                case 'helpful_count':
                    currentCount = stats.helpfulVotes;
                    break;
            }
            const isEarned = earnedBadgeIds.includes(badge.id);
            const progress = badge.requirementValue ? Math.min(100, (currentCount / badge.requirementValue) * 100) : 0;
            return {
                badge,
                progress: Math.round(progress),
                isEarned,
            };
        });
    }
    /**
     * Map database badge row to Badge type
     */
    mapDbBadgeToBadge(row) {
        return {
            id: row.id,
            name: row.name,
            description: row.description,
            iconUrl: row.icon_url,
            badgeType: row.badge_type,
            requirementValue: row.requirement_value,
            color: row.color,
            createdAt: row.created_at,
        };
    }
}
exports.BadgeService = BadgeService;
//# sourceMappingURL=BadgeService.js.map