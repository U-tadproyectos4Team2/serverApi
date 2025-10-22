const admin = require('firebase-admin');
const path = require('path');

const initializeFirebase = () => {
    try {
        const serviceAccountPath = path.join(__dirname, '../../firebaseKey.json');
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({credential: admin.credential.cert(serviceAccount)});

    console.log('Firebase initialized successfully');
    return admin.firestore();
    
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
};

module.exports = {
    initializeFirebase,
    admin
};