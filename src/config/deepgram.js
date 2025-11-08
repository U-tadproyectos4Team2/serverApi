require('dotenv').config();

const deepgramConfig = {
    apiKey: process.env.DEEPGRAM_API_KEY,
    
    defaultParamsES: {
        model: process.env.DEEPGRAM_MODEL || 'base',
        language: 'es',
        punctuate: true,
        filler_words: true,
        smart_format: false,
        numerals: false,
        diarize: false
    },

    defaultParamsEN: {
        model: process.env.DEEPGRAM_MODEL || 'base',
        language: 'en',
        punctuate: true,
        filler_words: true,
        smart_format: false,
        numerals: false,
        diarize: false
    }
};

const validateConfig = () => {
    if (!deepgramConfig.apiKey) {
        throw new Error('DEEPGRAM_API_KEY not found in environment variables');
    }
    console.log('Deepgram config validated');
};

module.exports = {
    deepgramConfig,
    validateConfig
};