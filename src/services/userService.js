const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');
const refreshTokenRepository = require('../repositories/refreshTokenRepository');
require('dotenv').config();
const { translateErrorMessage } = require('../utils/errorMessages');

class UserService {
  async register(userData) {
    const { email, username, password } = userData;
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await userRepository.create({ email, username, passwordHash });
    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async login(identifier, password) {
    const user = await userRepository.findByEmailOrUsername(identifier);
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      throw new Error(translateErrorMessage('Invalid credentials'));
    }
    const tokens = this.generateTokens(user);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  async logout(refreshToken) {
    await refreshTokenRepository.delete(refreshToken);
  }

  async updateUser(id, updates) {
    if (updates.password) {
      updates.passwordHash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }
    const user = await userRepository.update(id, updates);
    return this.sanitizeUser(user);
  }

  async changePassword(id, oldPassword, newPassword) {
    const user = await userRepository.findById(id);
    if (!(await bcrypt.compare(oldPassword, user.password_hash))) {
      throw new Error(translateErrorMessage('Invalid old password'));
    }
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await userRepository.update(id, { passwordHash });
  }

  async deleteUser(id) {
    await userRepository.delete(id);
  }

  async getMe(id) {
    const user = await userRepository.findProfileById(id);
    if (!user) throw new Error(translateErrorMessage('User not found'));
    return this.sanitizeUser(user);
  }

  async getUserById(id) {
    const user = await userRepository.findProfileById(id);
    if (!user) throw new Error(translateErrorMessage('User not found'));
    return this.sanitizeUser(user);
  }

  async follow(userId, targetId) {
    const parsedTargetId = parseInt(targetId, 10);
    if (userId === parsedTargetId) {
      throw new Error(translateErrorMessage('Cannot subscribe to yourself'));
    }
    const targetUser = await userRepository.findById(parsedTargetId);
    if (!targetUser) {
      throw new Error(translateErrorMessage('User not found'));
    }
    await userRepository.createSubscription(userId, parsedTargetId);
    return await this.getMe(userId);
  }

  async unfollow(userId, targetId) {
    const parsedTargetId = parseInt(targetId, 10);
    await userRepository.deleteSubscription(userId, parsedTargetId);
    return await this.getMe(userId);
  }

  generateTokens(user) {
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, username: user.username, isAdmin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    return { accessToken, refreshToken };
  }

  async saveRefreshToken(userId, token) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await refreshTokenRepository.create({ userId, token, expiresAt });
  }

  async refreshToken(refreshToken) {
    const tokenRecord = await refreshTokenRepository.findByToken(refreshToken);
    if (!tokenRecord) throw new Error(translateErrorMessage('Invalid refresh token'));
    const user = await userRepository.findById(tokenRecord.user_id);
    const tokens = this.generateTokens(user);
    await refreshTokenRepository.delete(refreshToken);
    await this.saveRefreshToken(user.id, tokens.refreshToken);
    return { user: this.sanitizeUser(user), ...tokens };
  }

  sanitizeUser(user) {
    const { password_hash, ...sanitized } = user;
    return sanitized;
  }
}

module.exports = new UserService();
