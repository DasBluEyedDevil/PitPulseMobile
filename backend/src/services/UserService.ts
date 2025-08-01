import Database from '../config/database';
import { User, CreateUserRequest, LoginRequest, AuthResponse } from '../types';
import { AuthUtils } from '../utils/auth';

export class UserService {
  private db = Database.getInstance();

  /**
   * Create a new user
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    const { email, password, username, firstName, lastName } = userData;

    // Validate input
    if (!AuthUtils.validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    const usernameValidation = AuthUtils.validateUsername(username);
    if (!usernameValidation.isValid) {
      throw new Error(usernameValidation.errors.join(', '));
    }

    const passwordValidation = AuthUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // Check if email already exists
    const emailExists = await this.findByEmail(email);
    if (emailExists) {
      throw new Error('Email already registered');
    }

    // Check if username already exists
    const usernameExists = await this.findByUsername(username);
    if (usernameExists) {
      throw new Error('Username already taken');
    }

    // Hash password
    const passwordHash = await AuthUtils.hashPassword(password);

    // Insert user into database
    const query = `
      INSERT INTO users (email, password_hash, username, first_name, last_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, email, username, first_name, last_name, bio, profile_image_url, 
                location, date_of_birth, is_verified, is_active, created_at, updated_at
    `;

    const values = [email, passwordHash, username, firstName || null, lastName || null];
    const result = await this.db.query(query, values);
    
    return this.mapDbUserToUser(result.rows[0]);
  }

  /**
   * Authenticate user login
   */
  async authenticateUser(loginData: LoginRequest): Promise<AuthResponse> {
    const { email, password } = loginData;

    // Find user by email
    const user = await this.findByEmailWithPassword(email);
    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.isActive) {
      throw new Error('Account is deactivated');
    }

    // Verify password
    const isValidPassword = await AuthUtils.comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = AuthUtils.generateToken({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    // Remove password hash from user object
    const { passwordHash, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * Find user by ID
   */
  async findById(userId: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, bio, profile_image_url,
             location, date_of_birth, is_verified, is_active, created_at, updated_at
      FROM users
      WHERE id = $1 AND is_active = true
    `;

    const result = await this.db.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbUserToUser(result.rows[0]);
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, bio, profile_image_url,
             location, date_of_birth, is_verified, is_active, created_at, updated_at
      FROM users
      WHERE email = $1 AND is_active = true
    `;

    const result = await this.db.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbUserToUser(result.rows[0]);
  }

  /**
   * Find user by email including password hash (for authentication)
   */
  private async findByEmailWithPassword(email: string): Promise<(User & { passwordHash: string }) | null> {
    const query = `
      SELECT id, email, password_hash, username, first_name, last_name, bio, 
             profile_image_url, location, date_of_birth, is_verified, is_active, 
             created_at, updated_at
      FROM users
      WHERE email = $1
    `;

    const result = await this.db.query(query, [email]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...this.mapDbUserToUser(row),
      passwordHash: row.password_hash,
    };
  }

  /**
   * Find user by username
   */
  async findByUsername(username: string): Promise<User | null> {
    const query = `
      SELECT id, email, username, first_name, last_name, bio, profile_image_url,
             location, date_of_birth, is_verified, is_active, created_at, updated_at
      FROM users
      WHERE username = $1 AND is_active = true
    `;

    const result = await this.db.query(query, [username]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return this.mapDbUserToUser(result.rows[0]);
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, updateData: Partial<User>): Promise<User> {
    const allowedFields = ['firstName', 'lastName', 'bio', 'profileImageUrl', 'location', 'dateOfBirth'];
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        const dbField = this.camelToSnakeCase(key);
        updates.push(`${dbField} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    if (updates.length === 0) {
      throw new Error('No valid fields to update');
    }

    values.push(userId);
    const query = `
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramCount} AND is_active = true
      RETURNING id, email, username, first_name, last_name, bio, profile_image_url,
                location, date_of_birth, is_verified, is_active, created_at, updated_at
    `;

    const result = await this.db.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('User not found or inactive');
    }

    return this.mapDbUserToUser(result.rows[0]);
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId: string): Promise<void> {
    const query = `
      UPDATE users 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;

    await this.db.query(query, [userId]);
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<{
    reviewCount: number;
    badgeCount: number;
    followerCount: number;
    followingCount: number;
  }> {
    const statsQuery = `
      SELECT 
        (SELECT COUNT(*) FROM reviews WHERE user_id = $1) as review_count,
        (SELECT COUNT(*) FROM user_badges WHERE user_id = $1) as badge_count,
        (SELECT COUNT(*) FROM user_followers WHERE following_id = $1) as follower_count,
        (SELECT COUNT(*) FROM user_followers WHERE follower_id = $1) as following_count
    `;

    const result = await this.db.query(statsQuery, [userId]);
    const stats = result.rows[0];

    return {
      reviewCount: parseInt(stats.review_count),
      badgeCount: parseInt(stats.badge_count),
      followerCount: parseInt(stats.follower_count),
      followingCount: parseInt(stats.following_count),
    };
  }

  /**
   * Map database user row to User type
   */
  private mapDbUserToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      bio: row.bio,
      profileImageUrl: row.profile_image_url,
      location: row.location,
      dateOfBirth: row.date_of_birth,
      isVerified: row.is_verified,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Convert camelCase to snake_case
   */
  private camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}