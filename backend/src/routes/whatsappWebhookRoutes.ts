import express, { Router } from 'express';
import { verifyWhatsAppWebhook, receiveWhatsAppWebhook } from '../controllers/whatsappWebhookController';

const router = Router();

// Public (Meta calls these) — authenticated by the verify token (GET) and
// the X-Hub-Signature-256 HMAC (POST) instead of a user session. The POST
// body is kept raw so the signature can be checked against the exact bytes.
router.get('/', verifyWhatsAppWebhook);
router.post('/', express.raw({ type: '*/*', limit: '1mb' }), receiveWhatsAppWebhook);

export default router;
