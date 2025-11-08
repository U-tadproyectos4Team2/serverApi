const multer = require('multer');

const errorMiddleware = (error, req, res, next) => {
    console.error(error.stack);

    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 15MB' });
        }
        return res.status(400).json({ error: error.message });
    }

    if (error.message === 'Session not found' || error.message === 'User profile not found') {
        return res.status(404).json({ success: false, error: error.message });
    }

    if (error.message === 'Access denied') {
        return res.status(403).json({ success: false, error: error.message });
    }

    res.status(500).json({
        success: false,
        error: 'Internal Server Error'
    });
};

module.exports = errorMiddleware;