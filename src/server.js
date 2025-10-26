require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const { initializeFirebase } = require('./config/firebase');
const { validateConfig } = require('./config/deepgram');
const audioUtils = require('./utils/audioUtils');
const deepgramService = require('./services/deepgramService');
const analysisService = require('./services/analysisService');
const firebaseService = require('./services/firebaseService');

const app = express();
const PORT = process.env.PORT || 3000;

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'audio/wav',
            'audio/mpeg',
            'audio/mp3',
            'audio/webm',
            'audio/ogg',
            'audio/flac',
            'audio/mp4',
            'audio/m4a',
            'audio/aac',
            'audio/x-m4a'
        ];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Supported: WAV, MP3, FLAC, OGG, WEBM, M4A, AAC'));
        }
    }
});

app.use(cors());
app.use(express.json());

const initializeServer = async () => {
    try {
        validateConfig();
        const db = initializeFirebase();
        firebaseService.initialize(db);

        setInterval(() => {
            audioUtils.cleanOldFiles();
        }, 60 * 60 * 1000);

    } catch (error) {
        process.exit(1);
    }
};

app.post('/api/transcribe', upload.single('audio'), async (req, res) => {
    let filepath = null;
    const sessionId = uuidv4();

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const language = req.body.language || 'en';
        if (!['en', 'es'].includes(language)) {
            return res.status(400).json({ error: 'Language must be "en" or "es"' });
        }

        const base64Audio = req.file.buffer.toString('base64');
        filepath = audioUtils.saveBase64ToFile(base64Audio, sessionId);

        const transcriptionData = await deepgramService.transcribeAudio(filepath, language);
        const words = deepgramService.extractWords(transcriptionData);
        const pauses = deepgramService.calculatePauses(words);
        const pauseStatistics = deepgramService.getPauseStatistics(pauses);

        const fillerAnalysis = analysisService.analyzeTranscription(transcriptionData, language);
        
        const speechQuality = analysisService.analyzeSpeechQuality(
            transcriptionData,
            { pauses, statistics: pauseStatistics },
            fillerAnalysis
        );

        const completeAnalysis = {
            sessionId,
            language,
            transcription: transcriptionData,
            pauses: {
                pauses,
                statistics: pauseStatistics
            },
            fillers: fillerAnalysis,
            quality: speechQuality
        };

        await firebaseService.saveCompleteAnalysis(sessionId, completeAnalysis);

        if (filepath) {
            audioUtils.deleteFile(filepath);
        }

        res.json({
            success: true,
            sessionId,
            data: {
                transcript: transcriptionData.transcript,
                language,
                duration: transcriptionData.metadata.duration,
                pauses: {
                    total: pauseStatistics.totalPauses,
                    totalTime: pauseStatistics.totalPauseTime,
                    average: pauseStatistics.averagePauseDuration,
                    longest: pauseStatistics.longestPause
                },
                fillerWords: {
                    total: fillerAnalysis.statistics.totalFillers,
                    unique: fillerAnalysis.statistics.uniqueFillers,
                    percentage: fillerAnalysis.statistics.fillerPercentage,
                    mostCommon: fillerAnalysis.statistics.mostCommonFillers
                },
                quality: speechQuality
            }
        });

    } catch (error) {
        if (filepath) {
            audioUtils.deleteFile(filepath);
        }

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const sessionData = await firebaseService.getCompleteSession(sessionId);

        res.json({
            success: true,
            data: sessionData
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/api/sessions', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const sessions = await firebaseService.listSessions(limit);

        res.json({
            success: true,
            data: sessions
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.delete('/api/session/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        await firebaseService.deleteSession(sessionId);

        res.json({
            success: true,
            message: 'Session deleted successfully'
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
        }
        return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
});

const startServer = async () => {
    await initializeServer();

    app.listen(PORT, () => {
        console.log(`Server running --- port ${PORT}`);
    });
};

startServer();

module.exports = app;