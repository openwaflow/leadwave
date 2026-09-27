/**
 * Group Routes
 * Handles all group messaging and management operations
 */

const express = require('express');

module.exports = (apiServer) => {
  const router = express.Router();
  const whatsappService = apiServer.appService.getWhatsAppService();

  /**
   * Send message to group
   * POST /api/groups/send-message
   */
  router.post('/send-message', async (req, res) => {
    try {
      const { session_id, group_id, message, mentions } = req.body;

      if (!session_id || !group_id || !message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'session_id, group_id, and message are required'
        });
      }

      // Format group ID
      const formattedGroupId = group_id.includes('@') ? group_id : `${group_id}@g.us`;

      const result = await whatsappService.sendGroupMessage(
        session_id,
        formattedGroupId,
        message,
        mentions || []
      );

      if (result.success) {
        res.json({
          success: true,
          message_id: result.messageId,
          timestamp: result.timestamp,
          group_id: formattedGroupId
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to send group message'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Send media to group
   * POST /api/groups/send-media
   */
  router.post('/send-media', async (req, res) => {
    try {
      const { session_id, group_id, media_url, type, caption } = req.body;

      if (!session_id || !group_id || !media_url || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'session_id, group_id, media_url, and type are required'
        });
      }

      const validTypes = ['image', 'video', 'audio', 'document'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid media type',
          message: `Type must be one of: ${validTypes.join(', ')}`
        });
      }

      const formattedGroupId = group_id.includes('@') ? group_id : `${group_id}@g.us`;

      const mediaContent = {
        [type]: { url: media_url }
      };

      if (caption) {
        mediaContent.caption = caption;
      }

      const result = await whatsappService.sendMessage(
        session_id,
        formattedGroupId,
        mediaContent,
        type
      );

      if (result.success) {
        res.json({
          success: true,
          message_id: result.messageId,
          timestamp: result.timestamp,
          group_id: formattedGroupId,
          media_type: type
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to send media to group'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get all groups
   * GET /api/groups/list
   */
  router.get('/list', async (req, res) => {
    try {
      const { session_id } = req.query;

      if (!session_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter',
          message: 'session_id is required'
        });
      }

      const groups = await whatsappService.getGroups(session_id);

      res.json({
        success: true,
        groups: groups || [],
        count: groups ? groups.length : 0
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};

