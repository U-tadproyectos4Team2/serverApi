const firebaseService = require('../services/firebaseService');

/**
 * Registra un nuevo usuario en Firebase Authentication y crea su perfil en Firestore.
 */
exports.register = async (req, res, next) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required.' });
        }

        // Crear el usuario en Firebase Authentication
        const userRecord = await firebaseService.createUserAuth(email, password, name);
        
        // Crear el perfil en Firestore
        await firebaseService.saveUserProfile(userRecord.uid, email, name);
        
        res.status(201).json({ 
            success: true, 
            uid: userRecord.uid, 
            email: userRecord.email,
            name: userRecord.displayName
        });

    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            return res.status(409).json({ error: 'Email already in use.' });
        }
        if (error.code === 'auth/invalid-password') {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }
        next(error);
    }
};

/**
 * Obtiene el perfil del usuario actualmente autenticado.
 */
exports.getProfile = async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const profile = await firebaseService.getUserProfile(uid);
        res.json({ success: true, data: profile });
    } catch (error) {
        next(error);
    }
};

/**
 * Actualiza el perfil del usuario (por ejemplo, el nombre).
 */
exports.updateProfile = async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { name } = req.body;

        // Actualizar perfil en Firestore
        await firebaseService.saveUserProfile(uid, req.user.email, name);
        
        // Actualizar también en Firebase Auth
        await firebaseService.updateUserAuth(uid, { displayName: name });
        
        res.json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        next(error);
    }
};