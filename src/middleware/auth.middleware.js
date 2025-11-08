const { admin } = require('../config/firebase');

const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided or invalid format' });
    }

    const idToken = authHeader.split('Bearer ')[1];

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken; // { uid, email, name, etc. }
        
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized. Invalid or expired token.' });
    }
};

module.exports = authMiddleware;