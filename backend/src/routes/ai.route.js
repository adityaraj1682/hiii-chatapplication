import express from 'express';
import { translateText } from '../controllers/ai.controller.js';

const router = express.Router();

router.post('/translate', translateText);

export default router;