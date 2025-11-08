const router = require('express').Router();
const authMiddleware = require('../middleware/auth.middleware');
const authController = require('../controllers/auth.controller');

// POST /api/auth/register
// Ruta pública para crear un nuevo usuario
router.post('/register', authController.register);

// GET /api/auth/profile
// Obtiene el perfil del usuario logueado
router.get('/profile', authMiddleware, authController.getProfile);

// PUT /api/auth/profile
// Actualiza el perfil del usuario logueado
router.put('/profile', authMiddleware, authController.updateProfile);

module.exports = router;