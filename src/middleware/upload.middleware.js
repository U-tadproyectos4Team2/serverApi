const multer = require('multer');

const storage = multer.memoryStorage();

const allowedMimes = [
    'audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm',
    'audio/ogg', 'audio/flac', 'audio/mp4', 'audio/m4a',
    'audio/aac', 'audio/x-m4a'
];

const fileFilter = (req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Supported: WAV, MP3, FLAC, OGG, WEBM, M4A, AAC'));
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 15 * 1024 * 1024 
    },
    fileFilter: fileFilter
});

module.exports = upload;