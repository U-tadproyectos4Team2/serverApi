const { v4: uuidv4 } = require('uuid');
const deepgramService = require('../services/deepgramService');
const analysisService = require('../services/analysisService');
const firebaseService = require('../services/firebaseService');

exports.createSession = async (req, res, next) => {
    const sessionId = uuidv4();
    const userId = req.user.uid;

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No audio file provided' });
        }

        const language = req.body.language || 'en';
        if (!['en', 'es'].includes(language)) {
            return res.status(400).json({ error: 'Language must be "en" or "es"' });
        }
        
        const audioBuffer = req.file.buffer;

        // Transcribir
        const transcriptionData = await deepgramService.transcribeAudio(audioBuffer, language);
        
        // Analizar
        const words = deepgramService.extractWords(transcriptionData);
        const pauses = deepgramService.calculatePauses(words);
        const pauseStatistics = deepgramService.getPauseStatistics(pauses);
        const fillerAnalysis = analysisService.analyzeTranscription(transcriptionData, language);
        
        const oratoryAnalysis = analysisService.analyzeOratory(
            transcriptionData,
            { pauses, statistics: pauseStatistics },
            fillerAnalysis
        );

        // Subir audio a Storage
        /*
        const audioStoragePath = await firebaseService.uploadAudioToStorage(
            audioBuffer,
            userId,
            sessionId,
            req.file.mimetype
        );
        */

        // Guardar análisis en Firestore
        const completeAnalysis = {
            sessionId,
            userId,
            language,
            // audioStoragePath: audioStoragePath,
            transcription: transcriptionData,
            pauses: { pauses, statistics: pauseStatistics },
            fillers: fillerAnalysis,
            quality: oratoryAnalysis
        };

        await firebaseService.saveCompleteAnalysis(sessionId, completeAnalysis);

        // Responder
        res.status(201).json({
            success: true,
            sessionId,
            data: {
                transcript: transcriptionData.transcript,
                quality: oratoryAnalysis.keyMetrics,
                feedback: oratoryAnalysis.feedback
            }
        });

    } catch (error) {
        next(error);
    }
};

exports.listUserSessions = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const limit = parseInt(req.query.limit) || 10;
        const sessions = await firebaseService.listSessions(userId, limit);
        res.json({ success: true, data: sessions });
    } catch (error) {
        next(error);
    }
};

exports.getSessionDetails = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { sessionId } = req.params;
        const sessionData = await firebaseService.getCompleteSession(sessionId, userId);
        res.json({ success: true, data: sessionData });
    } catch (error) {
        next(error);
    }
};

exports.deleteUserSession = async (req, res, next) => {
    try {
        const userId = req.user.uid;
        const { sessionId } = req.params;
        
        // await firebaseService.deleteAudioFromStorage(sessionId, userId);
        await firebaseService.deleteSession(sessionId, userId);
        
        res.json({ success: true, message: 'Session analysis deleted successfully' });
    } catch (error) {
        next(error);
    }
};

exports.getSessionAudio = async (req, res, next) => {
    res.status(501).json({ 
        success: false, 
        error: 'Audio storage functionality is currently disabled.' 
    });
};