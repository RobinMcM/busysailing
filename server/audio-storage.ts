import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import crypto from 'crypto';

const AUDIO_DIR = path.join(process.cwd(), 'client', 'public', 'temp-audio');

// Ensure audio directory exists
async function ensureAudioDir() {
  if (!existsSync(AUDIO_DIR)) {
    await mkdir(AUDIO_DIR, { recursive: true });
    console.log('[AudioStorage] Created temp-audio directory');
  }
}

export async function saveAudioFile(audioBuffer: ArrayBuffer, textHash?: string): Promise<string> {
  await ensureAudioDir();
  
  // Generate filename based on text hash or random
  const filename = textHash 
    ? `audio_${textHash}.mp3` 
    : `audio_${crypto.randomBytes(8).toString('hex')}.mp3`;
  
  const filepath = path.join(AUDIO_DIR, filename);
  
  // Save the file
  await writeFile(filepath, Buffer.from(audioBuffer));
  
  // Return public URL path
  const publicUrl = `/temp-audio/${filename}`;
  console.log('[AudioStorage] Saved audio file:', publicUrl);
  
  return publicUrl;
}

export function hashText(text: string): string {
  return crypto.createHash('md5').update(text).digest('hex');
}
