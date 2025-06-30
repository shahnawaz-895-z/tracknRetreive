import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BLIP2Service {
    constructor() {
        this.pythonScript = path.join(__dirname, 'blip2_service.py');
    }

    async generateCaption(imagePath) {
        return new Promise((resolve, reject) => {
            const pythonProcess = spawn('python', [this.pythonScript, imagePath]);

            let output = '';
            let error = '';

            pythonProcess.stdout.on('data', (data) => {
                output += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                error += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code !== 0) {
                    reject(new Error(`Python process exited with code ${code}: ${error}`));
                    return;
                }
                resolve(output.trim());
            });
        });
    }
}

export const blip2_service = new BLIP2Service(); 