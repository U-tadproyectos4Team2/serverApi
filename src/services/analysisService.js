class AnalysisService {
    constructor() {
        this.fillerWordsDictionary = {
            en: [
                'um', 'uh', 'er', 'ah', 'like', 'you know', 'actually', 
                'basically', 'literally', 'sort of', 'kind of', 'i mean',
                'right', 'okay', 'so', 'well', 'just', 'really'
            ],
            es: [
                'eh', 'este', 'pues', 'bueno', 'o sea', 'entonces', 
                'como', 'verdad', 'digamos', 'tipo', 'en plan', 'vaya',
                'vale', 'mira', 'sabes', 'claro', 'nada', 'tío', 'tía'
            ]
        };
    }

    detectFillerWords(words, language = 'en') {
        const fillersList = this.fillerWordsDictionary[language] || this.fillerWordsDictionary.en;
        const detectedFillers = [];

        words.forEach((wordObj, index) => {
            const normalizedWord = wordObj.word.toLowerCase().trim();
            
            if (fillersList.includes(normalizedWord)) {
                detectedFillers.push({
                    word: normalizedWord,
                    originalWord: wordObj.word,
                    position: index,
                    timestamp: wordObj.start,
                    confidence: wordObj.confidence
                });
            }

            if (index < words.length - 1) {
                const bigram = `${normalizedWord} ${words[index + 1].word.toLowerCase().trim()}`;
                if (fillersList.includes(bigram)) {
                    detectedFillers.push({
                        word: bigram,
                        originalWord: `${wordObj.word} ${words[index + 1].word}`,
                        position: index,
                        timestamp: wordObj.start,
                        confidence: (wordObj.confidence + words[index + 1].confidence) / 2
                    });
                }
            }
        });

        return detectedFillers;
    }

    countFillerWords(detectedFillers) {
        const fillerCount = {};

        detectedFillers.forEach(filler => {
            const key = filler.word;
            if (!fillerCount[key]) {
                fillerCount[key] = {
                    count: 0,
                    occurrences: []
                };
            }
            fillerCount[key].count++;
            fillerCount[key].occurrences.push({
                timestamp: filler.timestamp,
                position: filler.position,
                originalWord: filler.originalWord
            });
        });

        return fillerCount;
    }

    getFillerStatistics(fillerCount, totalWords) {
        const totalFillers = Object.values(fillerCount).reduce((sum, item) => sum + item.count, 0);
        const uniqueFillers = Object.keys(fillerCount).length;
        const fillerPercentage = totalWords > 0 ? (totalFillers / totalWords) * 100 : 0;

        const sortedFillers = Object.entries(fillerCount)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([word, data]) => ({
                word,
                count: data.count,
                percentage: totalWords > 0 ? (data.count / totalWords) * 100 : 0
            }));

        return {
            totalFillers,
            uniqueFillers,
            fillerPercentage,
            mostCommonFillers: sortedFillers.slice(0, 5),
            allFillers: sortedFillers
        };
    }

    analyzeTranscription(transcriptionData, language = 'en') {
        const words = transcriptionData.words;
        const detectedFillers = this.detectFillerWords(words, language);
        const fillerCount = this.countFillerWords(detectedFillers);
        const statistics = this.getFillerStatistics(fillerCount, words.length);

        return {
            fillerWords: fillerCount,
            statistics,
            detectedFillers
        };
    }

    calculateSpeakingRate(words, duration) {
        if (duration === 0) return 0;
        
        return {
            wordsPerMinute: (words.length / duration) * 60,
            wordsPerSecond: words.length / duration
        };
    }

    analyzeSpeechQuality(transcriptionData, pauseData, fillerData) {
        const duration = transcriptionData.metadata.duration;
        const totalWords = transcriptionData.words.length;
        
        const speakingRate = this.calculateSpeakingRate(transcriptionData.words, duration);
        const pausePercentage = (pauseData.totalPauseTime / duration) * 100;
        const fillerPercentage = fillerData.statistics.fillerPercentage;

        return {
            duration,
            totalWords,
            speakingRate,
            pausePercentage,
            fillerPercentage,
            averageConfidence: transcriptionData.confidence,
            qualityScore: this.calculateQualityScore(fillerPercentage, pausePercentage, speakingRate.wordsPerMinute)
        };
    }

    calculateQualityScore(fillerPercentage, pausePercentage, wordsPerMinute) {
        let score = 100;

        if (fillerPercentage > 10) score -= (fillerPercentage - 10) * 2;
        if (pausePercentage > 30) score -= (pausePercentage - 30);
        if (wordsPerMinute < 120 || wordsPerMinute > 180) {
            score -= Math.abs(150 - wordsPerMinute) * 0.2;
        }

        return Math.max(0, Math.min(100, score)).toFixed(2);
    }
}

module.exports = new AnalysisService();