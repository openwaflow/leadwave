/**
 * Contacts Routes
 * Handles contact management operations
 */

const express = require('express');

module.exports = (apiServer) => {
  const router = express.Router();
  const databaseService = apiServer.databaseService;

  /**
   * Get all contacts
   * GET /api/contacts/list
   */
  router.get('/list', async (req, res) => {
    try {
      const { session_id } = req.query;

      const db = databaseService.getDatabase();
      let contacts;

      if (session_id) {
        contacts = await db.all(
          'SELECT * FROM contacts WHERE session_id = ? ORDER BY name ASC',
          [session_id]
        );
      } else {
        contacts = await db.all('SELECT * FROM contacts ORDER BY name ASC');
      }

      res.json({
        success: true,
        contacts: contacts || [],
        count: contacts ? contacts.length : 0
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Search contacts
   * GET /api/contacts/search
   */
  router.get('/search', async (req, res) => {
    try {
      const { query, session_id } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter',
          message: 'query parameter is required'
        });
      }

      const db = databaseService.getDatabase();
      let contacts;

      if (session_id) {
        contacts = await db.all(
          `SELECT * FROM contacts 
           WHERE session_id = ? AND (name LIKE ? OR phone LIKE ?)
           ORDER BY name ASC`,
          [session_id, `%${query}%`, `%${query}%`]
        );
      } else {
        contacts = await db.all(
          `SELECT * FROM contacts 
           WHERE name LIKE ? OR phone LIKE ?
           ORDER BY name ASC`,
          [`%${query}%`, `%${query}%`]
        );
      }

      res.json({
        success: true,
        contacts: contacts || [],
        count: contacts ? contacts.length : 0
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get contact by phone
   * GET /api/contacts/:phone
   */
  router.get('/:phone', async (req, res) => {
    try {
      const { phone } = req.params;
      const { session_id } = req.query;

      const db = databaseService.getDatabase();
      let contact;

      if (session_id) {
        contact = await db.get(
          'SELECT * FROM contacts WHERE phone = ? AND session_id = ?',
          [phone, session_id]
        );
      } else {
        contact = await db.get(
          'SELECT * FROM contacts WHERE phone = ?',
          [phone]
        );
      }

      if (contact) {
        res.json({
          success: true,
          contact
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Contact not found'
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
   * Check if contact exists on WhatsApp
   * POST /api/contacts/check
   */
  router.post('/check', async (req, res) => {
    try {
      const { session_id, phone } = req.body;

      if (!session_id || !phone) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields',
          message: 'session_id and phone are required'
        });
      }

      const whatsappService = apiServer.appService.getWhatsAppService();
      const exists = await whatsappService.checkNumberExists(session_id, phone);

      res.json({
        success: true,
        phone,
        exists: exists || false
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

