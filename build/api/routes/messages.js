/**
 * Message Routes
 * Handles all message sending operations
 */

const express = require('express');

module.exports = (apiServer) => {
  const router = express.Router();
  const whatsappService = apiServer.appService.getWhatsAppService();

  /**
   * Validate that a phone number is registered on WhatsApp.
   * Returns null on success, or a ready-made error response object on failure.
   */
  async function validateRecipient(sessionId, formattedNumber, res) {
    try {
      const check = await whatsappService.checkNumberExists(sessionId, formattedNumber);
      if (!check.success) {
        res.status(400).json({
          success: false,
          error: 'Number validation failed',
          message: check.error || 'Could not verify phone number on WhatsApp'
        });
        return false;
      }
      if (!check.exists) {
        res.status(400).json({
          success: false,
          error: 'Invalid recipient',
          message: `The number ${formattedNumber} is not registered on WhatsApp`
        });
        return false;
      }
    } catch (err) {
      // If the check itself throws, allow the send to proceed rather than blocking
    }
    return true;
  }

  /**
   * Send text message
   * POST /api/messages/send
   */
  router.post('/send', async (req, res) => {
    try {
      const { session_id, to, message, quoted_message_id } = req.body;

      // Validation
      if (!session_id || !to || !message) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'session_id, to, and message are required'
        });
      }

      // Format phone number
      const formattedNumber = to.replace(/[^\d]/g, '');
      const jid = formattedNumber.includes('@') ? formattedNumber : `${formattedNumber}@s.whatsapp.net`;

      // Verify recipient exists on WhatsApp
      if (!await validateRecipient(session_id, formattedNumber, res)) return;

      // Send message
      const result = await whatsappService.sendMessage(
        session_id,
        jid,
        message,
        'text',
        quoted_message_id ? { quoted: quoted_message_id } : {}
      );

      if (result.success) {
        res.json({
          success: true,
          message_id: result.messageId,
          timestamp: result.timestamp,
          to: jid
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to send message'
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
   * Send media message (image, video, audio, document)
   * POST /api/messages/send-media
   */
  router.post('/send-media', async (req, res) => {
    try {
      const { session_id, to, media_url, type, caption, filename } = req.body;

      // Validation
      if (!session_id || !to || !media_url || !type) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'session_id, to, media_url, and type are required'
        });
      }

      // Validate media type
      const validTypes = ['image', 'video', 'audio', 'document'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid media type',
          message: `Type must be one of: ${validTypes.join(', ')}`
        });
      }

      // Format phone number
      const formattedNumber = to.replace(/[^\d]/g, '');
      const jid = formattedNumber.includes('@') ? formattedNumber : `${formattedNumber}@s.whatsapp.net`;

      // Verify recipient exists on WhatsApp
      if (!await validateRecipient(session_id, formattedNumber, res)) return;

      // Prepare media content
      const mediaContent = {
        [type]: { url: media_url }
      };

      if (caption) {
        mediaContent.caption = caption;
      }

      if (filename && type === 'document') {
        mediaContent.fileName = filename;
      }

      // Send media message
      const result = await whatsappService.sendMessage(
        session_id,
        jid,
        mediaContent,
        type
      );

      if (result.success) {
        res.json({
          success: true,
          message_id: result.messageId,
          timestamp: result.timestamp,
          to: jid,
          media_type: type
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to send media message'
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
   * Send button message
   * POST /api/messages/send-buttons
   */
  router.post('/send-buttons', async (req, res) => {
    try {
      const { session_id, to, text, footer, buttons } = req.body;

      if (!session_id || !to || !text || !buttons || !Array.isArray(buttons)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'session_id, to, text, and buttons array are required'
        });
      }

      const formattedNumber = to.replace(/[^\d]/g, '');
      const jid = formattedNumber.includes('@') ? formattedNumber : `${formattedNumber}@s.whatsapp.net`;

      // Verify recipient exists on WhatsApp
      if (!await validateRecipient(session_id, formattedNumber, res)) return;

      // Prepare button content
      const buttonContent = {
        text,
        footer: footer || '',
        buttons: buttons.map((btn, index) => ({
          buttonId: btn.id || `btn_${index}`,
          buttonText: { displayText: btn.text },
          type: 1
        }))
      };

      const result = await whatsappService.sendMessage(
        session_id,
        jid,
        buttonContent,
        'buttons'
      );

      if (result.success) {
        res.json({
          success: true,
          message_id: result.messageId,
          timestamp: result.timestamp,
          to: jid
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to send button message'
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
   * Send list message
   * POST /api/messages/send-list
   */
  router.post('/send-list', async (req, res) => {
    try {
      const { session_id, to, text, button_text, sections } = req.body;

      if (!session_id || !to || !text || !button_text || !sections) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'session_id, to, text, button_text, and sections are required'
        });
      }

      const formattedNumber = to.replace(/[^\d]/g, '');
      const jid = formattedNumber.includes('@') ? formattedNumber : `${formattedNumber}@s.whatsapp.net`;

      // Verify recipient exists on WhatsApp
      if (!await validateRecipient(session_id, formattedNumber, res)) return;

      const listContent = {
        text,
        buttonText: button_text,
        sections
      };

      const result = await whatsappService.sendMessage(
        session_id,
        jid,
        listContent,
        'list'
      );

      if (result.success) {
        res.json({
          success: true,
          message_id: result.messageId,
          timestamp: result.timestamp,
          to: jid
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to send list message'
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
   * Send location message
   * POST /api/messages/send-location
   */
  router.post('/send-location', async (req, res) => {
    try {
      const { session_id, to, latitude, longitude, name, address } = req.body;

      if (!session_id || !to || !latitude || !longitude) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'session_id, to, latitude, and longitude are required'
        });
      }

      const formattedNumber = to.replace(/[^\d]/g, '');
      const jid = formattedNumber.includes('@') ? formattedNumber : `${formattedNumber}@s.whatsapp.net`;

      // Verify recipient exists on WhatsApp
      if (!await validateRecipient(session_id, formattedNumber, res)) return;

      const locationContent = {
        degreesLatitude: parseFloat(latitude),
        degreesLongitude: parseFloat(longitude),
        name: name || '',
        address: address || ''
      };

      const result = await whatsappService.sendMessage(
        session_id,
        jid,
        locationContent,
        'location'
      );

      if (result.success) {
        res.json({
          success: true,
          message_id: result.messageId,
          timestamp: result.timestamp,
          to: jid
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to send location'
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
   * Send contact message
   * POST /api/messages/send-contact
   */
  router.post('/send-contact', async (req, res) => {
    try {
      const { session_id, to, contacts } = req.body;

      if (!session_id || !to || !contacts || !Array.isArray(contacts)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'session_id, to, and contacts array are required'
        });
      }

      const formattedNumber = to.replace(/[^\d]/g, '');
      const jid = formattedNumber.includes('@') ? formattedNumber : `${formattedNumber}@s.whatsapp.net`;

      // Verify recipient exists on WhatsApp
      if (!await validateRecipient(session_id, formattedNumber, res)) return;

      const result = await whatsappService.sendMessage(
        session_id,
        jid,
        { contacts },
        'contact'
      );

      if (result.success) {
        res.json({
          success: true,
          message_id: result.messageId,
          timestamp: result.timestamp,
          to: jid
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to send contact'
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
   * Send poll message
   * POST /api/messages/send-poll
   */
  router.post('/send-poll', async (req, res) => {
    try {
      const { session_id, to, question, options, selectable_count } = req.body;

      if (!session_id || !to || !question || !options || !Array.isArray(options)) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'session_id, to, question, and options array are required'
        });
      }

      const formattedNumber = to.replace(/[^\d]/g, '');
      const jid = formattedNumber.includes('@') ? formattedNumber : `${formattedNumber}@s.whatsapp.net`;

      // Verify recipient exists on WhatsApp
      if (!await validateRecipient(session_id, formattedNumber, res)) return;

      const pollContent = {
        name: question,
        values: options,
        selectableCount: selectable_count || 1
      };

      const result = await whatsappService.sendMessage(
        session_id,
        jid,
        pollContent,
        'poll'
      );

      if (result.success) {
        res.json({
          success: true,
          message_id: result.messageId,
          timestamp: result.timestamp,
          to: jid
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to send poll'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  return router;
};