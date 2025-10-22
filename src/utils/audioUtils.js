const fs = require('fs');
const path = require('path');

class AudioUtils {
    saveBase64ToFile(base64Data, sessionId) {
    const tempPath = process.env.TEMP_AUDIO_PATH || './temp';
    
    if (!fs.existsSync(tempPath)) fs.mkdirSync(tempPath, { recursive: true });
        const timestamp = Date.now();
        const filename = `${sessionId}_${timestamp}.wav`;
        const filepath = path.join(tempPath, filename);
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filepath, buffer);

        return filepath;
    }

    deleteFile(filepath) {
        try {
            if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
        } catch (error) {
            console.error('Error deleting file:', error.message);
        }
    }
    
    cleanOldFiles() {
        const tempPath = process.env.TEMP_AUDIO_PATH || './temp';
    
        if (!fs.existsSync(tempPath)) return;
    
        const files = fs.readdirSync(tempPath);
        const oneHourAgo = Date.now() - (60 * 60 * 1000);

        files.forEach(file => {
            const filepath = path.join(tempPath, file);
            const stats = fs.statSync(filepath);
            
            if (stats.mtimeMs < oneHourAgo) this.deleteFile(filepath);
        });
    }

    getFileSizeMB(filepath) {
        const stats = fs.statSync(filepath);
        return stats.size / (1024 * 1024);
    }
}

module.exports = new AudioUtils();