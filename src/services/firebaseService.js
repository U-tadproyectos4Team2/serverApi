const { admin } = require('../config/firebase');

class FirebaseService {
    constructor() {
        this.db = null;
        this.auth = null;
        this.storage = null;
    }

    initialize(firestoreInstance) {
        this.db = firestoreInstance;
        this.auth = admin.auth();
        // this.storage = admin.storage().bucket(); 
    }

    async createUserAuth(email, password, displayName) {
        if (!this.auth) throw new Error('Firebase Auth not initialized');
        const userRecord = await this.auth.createUser({
            email: email,
            password: password,
            displayName: displayName
        });
        return userRecord;
    }

    async updateUserAuth(uid, updatedFields) {
        if (!this.auth) throw new Error('Firebase Auth not initialized');
        const userRecord = await this.auth.updateUser(uid, updatedFields);
        return userRecord;
    }

    async saveUserProfile(uid, email, name) {
        if (!this.db) throw new Error('Firebase not initialized');
        const userRef = this.db.collection('users').doc(uid);
        await userRef.set({
            uid,
            email,
            name: name || '',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }

    async getUserProfile(uid) {
        if (!this.db) throw new Error('Firebase not initialized');
        const doc = await this.db.collection('users').doc(uid).get();
        if (!doc.exists) throw new Error('User profile not found');
        return doc.data();
    }

    async uploadAudioToStorage(audioBuffer, userId, sessionId, mimeType) {
        /*
        if (!this.storage) {
            console.warn('Firebase Storage not initialized. Skipping audio upload.');
            return null;
        }
        
        const destination = `audio/${userId}/${sessionId}`;
        const file = this.storage.file(destination);
        
        await file.save(audioBuffer, {
            metadata: {
                contentType: mimeType,
                customMetadata: {
                    userId,
                    sessionId
                }
            }
        });
        
        return destination;
        */

        return null;
    }

    async getAudioSignedUrl(sessionId, userId) {
        /*
        if (!this.storage) throw new Error('Firebase Storage not initialized');
        
        const sessionDoc = await this.getTranscription(sessionId, userId);
        if (sessionDoc.userId !== userId) throw new Error('Access denied');

        if (!sessionDoc.audioStoragePath) {
            throw new Error('Audio file path not found for this session.');
        }

        const file = this.storage.file(sessionDoc.audioStoragePath);
        
        const [url] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutos
        });
        
        return url;
        */

        throw new Error('Audio storage functionality is currently disabled.');
    }

    async deleteAudioFromStorage(sessionId, userId) {
        /*
        if (!this.storage) {
            console.warn('Firebase Storage not initialized. Skipping audio deletion.');
            return;
        }
        
        const sessionDoc = await this.getTranscription(sessionId, userId);
        if (sessionDoc.userId !== userId) throw new Error('Access denied');
        
        if (sessionDoc.audioStoragePath) {
            try {
                await this.storage.file(sessionDoc.audioStoragePath).delete();
            } catch (error) {
                console.error('Failed to delete audio from storage:', error.message);
            }
        }
        */

        return;
    }

    async saveCompleteAnalysis(sessionId, analysisData) {
        if (!this.db) throw new Error('Firebase not initialized');

        const batch = this.db.batch();
        const transcriptionRef = this.db.collection('transcriptions').doc(sessionId);
        
        const { transcription, pauses, fillers, quality, ...sessionData } = analysisData;

        // 'audioStoragePath' será null o undefined, así que no se guardará o se guardará como null, lo cual está bien.
        batch.set(transcriptionRef, {
            ...sessionData, 
            transcript: transcription.transcript,
            confidence: transcription.confidence,
            metadata: transcription.metadata,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            qualitySummary: { 
                duration: quality.keyMetrics.duration,
                wpm: quality.keyMetrics.speakingRateWPM,
                fillerPercentage: quality.keyMetrics.fillerPercentage,
                pausePercentage: quality.keyMetrics.pausePercentage
            }
        });

        const pauseRef = transcriptionRef.collection('analysis').doc('pauses');
        batch.set(pauseRef, {
            pauses: pauses.pauses,
            statistics: pauses.statistics,
        });

        const fillerRef = transcriptionRef.collection('analysis').doc('fillers');
        batch.set(fillerRef, {
            fillerWords: fillers.fillerWords,
            statistics: fillers.statistics,
        });

        const qualityRef = transcriptionRef.collection('analysis').doc('quality');
        batch.set(qualityRef, quality);

        await batch.commit();
        return sessionId;
    }

    async getTranscription(sessionId, userId) {
        if (!this.db) throw new Error('Firebase not initialized');
        const doc = await this.db.collection('transcriptions').doc(sessionId).get();

        if (!doc.exists) {
            throw new Error('Session not found');
        }
        
        const data = doc.data();
        
        if (data.userId !== userId) {
            throw new Error('Access denied');
        }
        
        return data;
    }

    async getAnalysis(sessionId) {
        if (!this.db) throw new Error('Firebase not initialized');
        const analysisRef = this.db.collection('transcriptions').doc(sessionId).collection('analysis');
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

    async getCompleteSession(sessionId, userId) {
        if (!this.db) throw new Error('Firebase not initialized');
        
        const [transcription, analysis] = await Promise.all([
            this.getTranscription(sessionId, userId),
            this.getAnalysis(sessionId)
        ]);

        return { transcription, analysis };
    }

    async listSessions(userId, limit = 10) {
        if (!this.db) throw new Error('Firebase not initialized');

        const query = this.db
            .collection('transcriptions')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .select(
                'sessionId', 'language', 'transcript', 'createdAt', 'qualitySummary'
            );

        const snapshot = await query.get();
        return snapshot.docs.map(doc => doc.data());
    }

    async deleteSession(sessionId, userId) {
        if (!this.db) throw new Error('Firebase not initialized');
        
        await this.getTranscription(sessionId, userId); 

        const batch = this.db.batch();
        const transcriptionRef = this.db.collection('transcriptions').doc(sessionId);

        const analysisSnapshot = await transcriptionRef.collection('analysis').get();
        analysisSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        batch.delete(transcriptionRef);
        await batch.commit();

        return true;
    }
}

module.exports = new FirebaseService();