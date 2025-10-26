const { admin } = require('../config/firebase');

class FirebaseService {
    constructor() {
        this.db = null;
    }

    initialize(firestoreInstance) {
        this.db = firestoreInstance;
    }

    async saveTranscription(sessionId, data) {
        if (!this.db) throw new Error('Firebase not initialized');

        const transcriptionRef = this.db.collection('transcriptions').doc(sessionId);
        
        const transcriptionData = {
            sessionId,
            transcript: data.transcript,
            language: data.language,
            confidence: data.confidence,
            metadata: data.metadata,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        };

        await transcriptionRef.set(transcriptionData);
        return transcriptionRef.id;
    }

    async saveWords(sessionId, words) {
        if (!this.db) throw new Error('Firebase not initialized');

        const batch = this.db.batch();
        const wordsCollectionRef = this.db
            .collection('transcriptions')
            .doc(sessionId)
            .collection('words');

        words.forEach((word, index) => {
            const wordRef = wordsCollectionRef.doc(`word_${index}`);
            batch.set(wordRef, {
                ...word,
                index,
                sessionId
            });
        });

        await batch.commit();
        return words.length;
    }

    async savePauseAnalysis(sessionId, pauseData) {
        if (!this.db) throw new Error('Firebase not initialized');

        const pauseRef = this.db
            .collection('transcriptions')
            .doc(sessionId)
            .collection('analysis')
            .doc('pauses');

        await pauseRef.set({
            sessionId,
            pauses: pauseData.pauses,
            statistics: pauseData.statistics,
            analyzedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return pauseRef.id;
    }

    async saveFillerAnalysis(sessionId, fillerData) {
        if (!this.db) throw new Error('Firebase not initialized');

        const fillerRef = this.db
            .collection('transcriptions')
            .doc(sessionId)
            .collection('analysis')
            .doc('fillers');

        await fillerRef.set({
            sessionId,
            fillerWords: fillerData.fillerWords,
            statistics: fillerData.statistics,
            analyzedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return fillerRef.id;
    }

    async saveSpeechQuality(sessionId, qualityData) {
        if (!this.db) throw new Error('Firebase not initialized');

        const qualityRef = this.db
            .collection('transcriptions')
            .doc(sessionId)
            .collection('analysis')
            .doc('quality');

        await qualityRef.set({
            sessionId,
            ...qualityData,
            analyzedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return qualityRef.id;
    }

    async saveCompleteAnalysis(sessionId, analysisData) {
        if (!this.db) throw new Error('Firebase not initialized');

        const batch = this.db.batch();

        const transcriptionRef = this.db.collection('transcriptions').doc(sessionId);
        batch.set(transcriptionRef, {
            sessionId,
            transcript: analysisData.transcription.transcript,
            language: analysisData.language,
            confidence: analysisData.transcription.confidence,
            metadata: analysisData.transcription.metadata,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const pauseRef = transcriptionRef.collection('analysis').doc('pauses');
        batch.set(pauseRef, {
            pauses: analysisData.pauses.pauses,
            statistics: analysisData.pauses.statistics,
            analyzedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const fillerRef = transcriptionRef.collection('analysis').doc('fillers');
        batch.set(fillerRef, {
            fillerWords: analysisData.fillers.fillerWords,
            statistics: analysisData.fillers.statistics,
            analyzedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const qualityRef = transcriptionRef.collection('analysis').doc('quality');
        batch.set(qualityRef, analysisData.quality);

        await batch.commit();
        return sessionId;
    }

    async getTranscription(sessionId) {
        if (!this.db) throw new Error('Firebase not initialized');

        const doc = await this.db.collection('transcriptions').doc(sessionId).get();
        
        if (!doc.exists) {
            throw new Error('Transcription not found');
        }

        return doc.data();
    }

    async getAnalysis(sessionId) {
        if (!this.db) throw new Error('Firebase not initialized');

        const analysisRef = this.db
            .collection('transcriptions')
            .doc(sessionId)
            .collection('analysis');

        const [pausesDoc, fillersDoc, qualityDoc] = await Promise.all([
            analysisRef.doc('pauses').get(),
            analysisRef.doc('fillers').get(),
            analysisRef.doc('quality').get()
        ]);

        return {
            pauses: pausesDoc.exists ? pausesDoc.data() : null,
            fillers: fillersDoc.exists ? fillersDoc.data() : null,
            quality: qualityDoc.exists ? qualityDoc.data() : null
        };
    }

    async getCompleteSession(sessionId) {
        if (!this.db) throw new Error('Firebase not initialized');

        const [transcription, analysis] = await Promise.all([
            this.getTranscription(sessionId),
            this.getAnalysis(sessionId)
        ]);

        return {
            transcription,
            analysis
        };
    }

    async listSessions(limit = 10, startAfter = null) {
        if (!this.db) throw new Error('Firebase not initialized');

        let query = this.db
            .collection('transcriptions')
            .orderBy('createdAt', 'desc')
            .limit(limit);

        if (startAfter) {
            query = query.startAfter(startAfter);
        }

        const snapshot = await query.get();
        
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async deleteSession(sessionId) {
        if (!this.db) throw new Error('Firebase not initialized');

        const batch = this.db.batch();
        const transcriptionRef = this.db.collection('transcriptions').doc(sessionId);

        const analysisSnapshot = await transcriptionRef.collection('analysis').get();
        analysisSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        const wordsSnapshot = await transcriptionRef.collection('words').get();
        wordsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        batch.delete(transcriptionRef);
        await batch.commit();

        return true;
    }
}

module.exports = new FirebaseService();