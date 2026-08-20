import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { signup, login, logout, me, forgotPassword, resetPassword } from '../controllers/authController';
import { requireAuth } from '../middlewares/auth';

const router = Router();

const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 login attempts per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many login attempts. Please try again in 15 minutes.' } },
});

const signupRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 signups per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many accounts created from this IP. Please try again later.' } },
});

router.post('/signup', signupRateLimit, signup);
router.post('/login', loginRateLimit, login);
router.post('/logout', logout);
router.post('/forgot-password', loginRateLimit, forgotPassword);
router.post('/reset-password', loginRateLimit, resetPassword);
router.get('/me', requireAuth, me);

export default router;
