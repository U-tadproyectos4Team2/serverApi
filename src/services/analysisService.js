class AnalysisService {
    constructor() {
        this.fillerWordsDictionary = {
            en: [
                'um', 'uh', 'er', 'ah', 'like', 'you know', 'actually', 
                'basically', 'literally', 'sort of', 'kind of', 'i mean',
                'right', 'okay', 'so', 'well', 'just', 'really'
            ],
            es: [
                'hola', 'eh', 'este', 'pues', 'bueno', 'o sea', 'entonces', 
                'como', 'verdad', 'digamos', 'tipo', 'en plan', 'vaya',
                'vale', 'mira', 'sabes', 'claro', 'nada'
            ]
        };

        // Rangos óptimos para un contexto de entrevista (Ritmo)
        this.RITMO_OPTIMO = { min: 120, max: 160 }; // Palabras por Minuto
        
        // Umbrales críticos para el feedback (Muletillas y Pausas)
        this.UMBRAL_MULETILLAS = 3.0; // % sobre el total de palabras
        this.UMBRAL_PAUSAS_LARGAS = 2.0; // segundos
        this.UMBRAL_TIEMPO_EN_PAUSA = 20.0; // % del tiempo total
    }

    /**
     * Punto de entrada principal.
     * Analiza la oratoria completa a partir de los datos de transcripción y pausas.
     */
    analyzeOratory(transcriptionData, pauseData, fillerData) {
        const { metadata, words, confidence } = transcriptionData;
        const durationInSeconds = metadata.duration;
        const totalWords = words.length;

        // 1. Calcular Métricas Clave
        const speakingRate = this._calculateSpeakingRate(totalWords, durationInSeconds);
        const pausePercentage = (pauseData.statistics.totalPauseTime / durationInSeconds) * 100;
        const fillerPercentage = fillerData.statistics.fillerPercentage;
        
        const keyMetrics = {
            speakingRateWPM: parseFloat(speakingRate.wordsPerMinute.toFixed(1)),
            fillerPercentage: parseFloat(fillerPercentage.toFixed(2)),
            pausePercentage: parseFloat(pausePercentage.toFixed(2)),
            avgConfidence: parseFloat(confidence.toFixed(2)),
            duration: parseFloat(durationInSeconds.toFixed(2)),
            totalWords: totalWords
        };
        
        // 2. Generar Feedback Crítico
        const feedback = this._generateFeedback(
            keyMetrics,
            pauseData,
            fillerData
        );
        
        // 3. Devolver el análisis completo
        return {
            keyMetrics,
            feedback,
            fillerDetails: fillerData.statistics,
            pauseDetails: pauseData.statistics
        };
    }

    /**
     * Genera el objeto de feedback cualitativo.
     * @private
     */
    _generateFeedback(metrics, pauseData, fillerData) {
        const positivePoints = [];
        const improvementAreas = [];

        // --- Análisis de Ritmo (Velocidad) ---
        const feedbackRitmo = this._analyzePacing(metrics.speakingRateWPM);
        if (feedbackRitmo.esPositivoRitmo) {
            positivePoints.push(feedbackRitmo);
        } else {
            improvementAreas.push(feedbackRitmo);
        }

        // --- Análisis de Muletillas (Relleno) ---
        const feedbackMuletillas = this._analyzeFillers(metrics.fillerPercentage, fillerData.statistics);
        if (feedbackMuletillas.esPositivoMuletillas) {
            positivePoints.push(feedbackMuletillas);
        } else {
            improvementAreas.push(feedbackMuletillas);
        }

        // --- Análisis de Pausas (Fluidez) ---
        const feedbackPausas = this._analyzePauses(pauseData.pauses, metrics.pausePercentage);
        if (feedbackPausas.esPositivoPausas) {
            positivePoints.push(feedbackPausas);
        } else {
            improvementAreas.push(feedbackPausas);
        }

        // --- Análisis de Claridad (Confianza de transcripción) ---
        const feedbackClaridad = this._analyzeClarity(metrics.avgConfidence);
        if (feedbackClaridad.esPositivoClaridad) {
            positivePoints.push(feedbackClaridad);
        } else {
            improvementAreas.push(feedbackClaridad);
        }

        return { positivePoints, improvementAreas };
    }

    /**
     * Feedback sobre el ritmo (WPM).
     * @private
     */
    _analyzePacing(wpm) {
        if (wpm > this.RITMO_OPTIMO.max) {
            return {
                area: 'Ritmo',
                message: `Tu ritmo fue de ${wpm} PPM, lo cual es rápido. Esto puede transmitir nerviosismo o dificultar que el entrevistador te siga.`,
                suggestion: 'Intenta hacer pausas breves después de cada idea principal. Esto te ayudará a controlar la velocidad y dará tiempo al oyente para procesar.',
                esPositivoRitmo: false
            };
        }
        if (wpm < this.RITMO_OPTIMO.min) {
            return {
                area: 'Ritmo',
                message: `Tu ritmo fue de ${wpm} PPM, lo cual es lento. Esto puede proyectar falta de energía o inseguridad.`,
                suggestion: 'Trata de hablar con más dinamismo. Graba solo el inicio de tu respuesta varias veces hasta que suene fluido y con energía.',
                esPositivoRitmo: false
            };
        }
        return {
            area: 'Ritmo',
            message: `Tu ritmo de ${wpm} PPM está en un rango excelente (${this.RITMO_OPTIMO.min}-${this.RITMO_OPTIMO.max} PPM). Transmite control y es fácil de seguir.`,
            suggestion: '¡Gran trabajo! Mantén este ritmo controlado.',
            esPositivoRitmo: true
        };
    }

    /**
     * Feedback sobre las muletillas.
     * @private
     */
    _analyzeFillers(percentage, fillerStats) {
        const mostCommon = fillerStats.mostCommonFillers.length > 0 
            ? ` (principalmente '${fillerStats.mostCommonFillers[0].word}')` 
            : '';

        if (percentage > this.UMBRAL_MULETILLAS) {
            return {
                area: 'Muletillas',
                message: `Se detectó un ${percentage.toFixed(1)}% de muletillas${mostCommon}. Un uso elevado puede restar credibilidad y proyectar dudas.`,
                suggestion: `Intenta reemplazar las muletillas por pausas breves. Cuando sientas que vas a decir 'eh...' o 'pues...', simplemente haz silencio. Esto te dará tiempo para pensar y sonará más profesional.`,
                esPositivoMuletillas: false
            };
        }
        return {
            area: 'Muletillas',
            message: `Tu uso de muletillas fue muy bajo (${percentage.toFixed(1)}%). Esto es excelente y proyecta seguridad y claridad en tus ideas.`,
            suggestion: 'Sigue así. Un discurso limpio de muletillas es una señal de preparación.',
            esPositivoMuletillas: true
        };
    }

    /**
     * Feedback sobre las pausas.
     * @private
     */
    _analyzePauses(pauses, pausePercentage) {
        const pausasLargas = pauses.filter(p => p.duration > this.UMBRAL_PAUSAS_LARGAS).length;

        if (pausasLargas > 0) {
            return {
                area: 'Pausas y Fluidez',
                message: `Se detectaron ${pausasLargas} pausas largas (de más de ${this.UMBRAL_PAUSAS_LARGAS} seg). Esto puede interpretarse como duda o dificultad para encontrar la palabra adecuada.`,
                suggestion: 'Si te quedas en blanco, es mejor hacer una pausa corta, tomar aire y reenganchar, que mantener un silencio largo y tenso.',
                esPositivoPausas: false
            };
        }
        
        if (pausePercentage > this.UMBRAL_TIEMPO_EN_PAUSA) {
            return {
                area: 'Pausas y Fluidez',
                message: `Pasaste un ${pausePercentage.toFixed(0)}% de tu tiempo en silencio. Un porcentaje tan alto puede hacer que la conversación se sienta lenta o dubitativa.`,
                suggestion: 'Revisa si tus pausas son para pensar o por nervios. Intenta estructurar tu respuesta antes de empezar para reducir los silencios largos.',
                esPositivoPausas: false
            };
        }

        return {
            area: 'Pausas y Fluidez',
            message: `Hiciste un buen uso de las pausas. No se detectaron silencios excesivamente largos, lo que contribuye a una conversación fluida.`,
            suggestion: 'Las pausas bien gestionadas demuestran control. ¡Buen trabajo!',
            esPositivoPausas: true
        };
    }

    /**
     * Feedback sobre la claridad (basado en la confianza de Deepgram).
     * @private
     */
    _analyzeClarity(avgConfidence) {
        const confidencePercentage = (avgConfidence * 100).toFixed(0);

        if (avgConfidence < 0.85) {
            return {
                area: 'Claridad',
                message: `La confianza de la transcripción fue del ${confidencePercentage}%. Una puntuación baja puede indicar que vocalizaste poco, hablaste entre dientes o el micrófono estaba mal posicionado.`,
                suggestion: 'Asegúrate de vocalizar claramente y proyectar la voz. Una buena dicción es clave para ser entendido a la primera.',
                esPositivoClaridad: false
            };
        }
        return {
            area: 'Claridad',
            message: `La confianza de la transcripción fue del ${confidencePercentage}%. Esto indica que tu vocalización fue clara y el audio fue fácil de procesar.`,
            suggestion: '¡Excelente! Una dicción clara te hace parecer seguro y profesional.',
            esPositivoClaridad: true
        };
    }

    // --- FUNCIONES INTERNAS (Sin cambios) ---
    // Estas funciones son necesarias para los cálculos de 'analyzeOratory'

    /**
     * Calcula palabras por minuto y segundo.
     * @private
     */
    _calculateSpeakingRate(totalWords, durationInSeconds) {
        if (durationInSeconds === 0) {
            return { wordsPerMinute: 0, wordsPerSecond: 0 };
        }
        
        return {
            wordsPerMinute: (totalWords / durationInSeconds) * 60,
            wordsPerSecond: totalWords / durationInSeconds
        };
    }

    /**
     * Detecta muletillas en la lista de palabras.
     * (Basado en tu archivo original)
     */
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

    /**
     * Agrupa y cuenta las muletillas detectadas.
     * (Basado en tu archivo original)
     */
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

    /**
     * Genera estadísticas sobre las muletillas.
     * (Basado en tu archivo original)
     */
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

    /**
     * Función de utilidad para agrupar los datos de muletillas.
     * (Basado en tu archivo original)
     */
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
}

module.exports = new AnalysisService();