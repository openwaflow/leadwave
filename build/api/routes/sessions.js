/**
 * Session Routes
 * Handles WhatsApp session management and status
 */

const express = require('express');

module.exports = (apiServer) => {
  const router = express.Router();
  const whatsappService = apiServer.appService.getWhatsAppService();

  /**
   * Get session status
   * GET /api/sessions/status/:sessionId
   */
  router.get('/status/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;

      const status = await whatsappService.getSessionStatus(sessionId);

      if (status) {
        res.json({
          success: true,
          session_id: sessionId,
          status: status.status,
          connected: status.connected || false,
          phone_number: status.phoneNumber || null,
          qr_code: status.qrCode || null
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Session not found',
          message: `Session ${sessionId} does not exist`
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
   * Get all sessions
   * GET /api/sessions/list
   */
  router.get('/list', async (req, res) => {
    try {
      const sessions = await whatsappService.getAllSessions();

      res.json({
        success: true,
        sessions: sessions || [],
        count: sessions ? sessions.length : 0
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * Get session QR code
   * GET /api/sessions/qr/:sessionId
   */
  router.get('/qr/:sessionId', async (req, res) => {
    try {
      const { sessionId } = req.params;

      const status = await whatsappService.getSessionStatus(sessionId);

      if (status && status.qrCode) {
        res.json({
          success: true,
          session_id: sessionId,
          qr_code: status.qrCode
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'QR code not available',
          message: 'Session is either connected or QR code is not yet generated'
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
   * Disconnect session
   * POST /api/sessions/disconnect
   */
  router.post('/disconnect', async (req, res) => {
    try {
      const { session_id } = req.body;

      if (!session_id) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field',
          message: 'session_id is required'
        });
      }

      await whatsappService.disconnectSession(session_id);

      res.json({
        success: true,
        message: `Session ${session_id} disconnected successfully`
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

