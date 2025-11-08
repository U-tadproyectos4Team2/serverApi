const router = require('express').Router();
const authMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const sessionController = require('../controllers/session.controller');

// POST /api/sessions/
// Crea una nueva sesión (transcripción + análisis)
router.post(
    '/',
    [authMiddleware, upload.single('audio')],
    sessionController.createSession
);

// GET /api/sessions/
// Obtiene una lista de todas las sesiones del usuario logueado
router.get('/', authMiddleware, sessionController.listUserSessions);

// GET /api/sessions/:sessionId
// Obtiene una sesión específica por ID
router.get('/:sessionId', authMiddleware, sessionController.getSessionDetails);

// DELETE /api/sessions/:sessionId
// Borra una sesión específica
router.delete('/:sessionId', authMiddleware, sessionController.deleteUserSession);

// GET /api/sessions/:sessionId/audio
// Obtiene la URL de descarga del audio original
/*
router.get(
    '/:sessionId/audio', 
    authMiddleware, 
    sessionController.getSessionAudio
);
*/

module.exports = router;