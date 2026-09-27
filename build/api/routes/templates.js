/**
 * Template Routes
 * Handles template message operations
 */

const express = require('express');

module.exports = (apiServer) => {
  const router = express.Router();
  const whatsappService = apiServer.appService.getWhatsAppService();
  const databaseService = apiServer.databaseService;

  /**
   * Send template message
   * POST /api/templates/send
   */
  router.post('/send', async (req, res) => {
    try {
      const { session_id, to, template_id, variables } = req.body;

      if (!session_id || !to || !template_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'session_id, to, and template_id are required'
        });
      }

      // Look up template: try by numeric ID first, then by name (case-insensitive)
      let template = null;
      const isNumericId = /^[0-9]+$/.test(String(template_id).trim());

      if (isNumericId) {
        template = await databaseService.get(
          'SELECT * FROM message_templates WHERE id = ?',
          [parseInt(template_id, 10)]
        );
      }

      // Fallback: look up by name if not found by ID or if a name string was provided
      if (!template) {
        template = await databaseService.get(
          'SELECT * FROM message_templates WHERE LOWER(name) = LOWER(?)',
          [String(template_id).trim()]
        );
      }

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Template not found',
          message: `No template found with ID or name "${template_id}"`
        });
      }

      // Format phone number
      const formattedNumber = to.replace(/[^\d]/g, '');
      const jid = formattedNumber.includes('@') ? formattedNumber : `${formattedNumber}@s.whatsapp.net`;

      // Verify recipient exists on WhatsApp
      try {
        const check = await whatsappService.checkNumberExists(session_id, formattedNumber);
        if (check.success && !check.exists) {
          return res.status(400).json({
            success: false,
            error: 'Invalid recipient',
            message: `The number ${formattedNumber} is not registered on WhatsApp`
          });
        }
      } catch (_) { /* If check itself fails, proceed with send */ }

      // Use sendTemplateMessage which correctly handles ALL template types
      // (text, image, video, document, buttons, list, poll, flow, carousel, etc.)
      // and performs variable substitution internally using the template's variables field.
      const variablesObj = (variables && typeof variables === 'object') ? variables : {};
      const result = await whatsappService.sendTemplateMessage(session_id, jid, template, variablesObj);

      if (result && result.success) {
        res.json({
          success: true,
          message_id: result.messageId,
          timestamp: result.timestamp,
          to: jid,
          template_id: template.id,
          template_name: template.name
        });
      } else {
        res.status(500).json({
          success: false,
          error: (result && result.error) || 'Failed to send template message'
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
   * Get all templates
   * GET /api/templates/list
   */
  router.get('/list', async (req, res) => {
    try {
      const result = await databaseService.query(
        'SELECT id, name, type, category, content, variables, created_at FROM message_templates ORDER BY created_at DESC'
      );

      const templates = (result.success && result.data) ? result.data : [];
      res.json({
        success: true,
        templates,
        count: templates.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get template by ID or name
   * GET /api/templates/:id
   */
  router.get('/:id', async (req, res) => {
    try {
      const { id } = req.params;

      let template = null;
      const isNumericId = /^[0-9]+$/.test(String(id).trim());

      if (isNumericId) {
        template = await databaseService.get(
          'SELECT * FROM message_templates WHERE id = ?',
          [parseInt(id, 10)]
        );
      }

      if (!template) {
        template = await databaseService.get(
          'SELECT * FROM message_templates WHERE LOWER(name) = LOWER(?)',
          [String(id).trim()]
        );
      }

      if (template) {
        res.json({
          success: true,
          template
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Template not found'
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

