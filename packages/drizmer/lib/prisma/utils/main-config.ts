
import * as fs from 'fs';
import * as path from 'path';

type DrizzmaConfig = {
    generatorOption: {
        outputPath:string,
        provider: string
    }
}
export function readConfigFile(filePath: string): DrizzmaConfig | null {
    try {
        const jsonData = fs.readFileSync(filePath, 'utf-8');
        
        const config: DrizzmaConfig = JSON.parse(jsonData);
        
        return config;
    } catch (error) {
        console.error('Error reading or parsing the config file:', error);
        return null;
    }
}