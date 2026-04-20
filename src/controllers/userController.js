const userService = require('../services/userService');
const { translateErrorMessage } = require('../utils/errorMessages');

class UserController {
  async register(req, res) {
    try {
      const { email, username, password } = req.body;
      const result = await userService.register({ email, username, password });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(400).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async login(req, res) {
    try {
      const { identifier, password } = req.body;
      const result = await userService.login(identifier, password);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(401).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async logout(req, res) {
    try {
      const { refreshToken } = req.body;
      await userService.logout(refreshToken);
      res.json({ success: true, message: translateErrorMessage('Logged out') });
    } catch (error) {
      res.status(400).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async updateUser(req, res) {
    try {
      const updates = req.body;
      const user = await userService.updateUser(req.user.id, updates);
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async changePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      await userService.changePassword(req.user.id, oldPassword, newPassword);
      res.json({ success: true, message: translateErrorMessage('Password changed') });
    } catch (error) {
      res.status(400).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async deleteUser(req, res) {
    try {
      await userService.deleteUser(req.user.id);
      res.json({ success: true, message: translateErrorMessage('User deleted') });
    } catch (error) {
      res.status(400).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;
      const result = await userService.refreshToken(refreshToken);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(401).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async getById(req, res) {
    try {
      const user = await userService.getUserById(req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(404).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async me(req, res) {
    try {
      const user = await userService.getMe(req.user.id);
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(404).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async follow(req, res) {
    try {
      const user = await userService.follow(req.user.id, req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({ success: false, message: translateErrorMessage(error) });
    }
  }

  async unfollow(req, res) {
    try {
      const user = await userService.unfollow(req.user.id, req.params.id);
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(400).json({ success: false, message: translateErrorMessage(error) });
    }
  }
}

module.exports = new UserController();
