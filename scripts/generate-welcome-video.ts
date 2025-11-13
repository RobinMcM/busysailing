import fs from 'fs';
import path from 'path';

const AVATARTALK_API_KEY = process.env.AVATARTALK_API_KEY;

if (!AVATARTALK_API_KEY) {
  console.error('ERROR: AVATARTALK_API_KEY environment variable not set');
  process.exit(1);
}

async function generateWelcomeVideo() {
  console.log('🎬 Generating welcome video with AvatarTalk API...');
  
  const welcomeText = "Hello, how may I help you?";
  const avatar = 'european_woman';
  const emotion = 'neutral';
  const language = 'en';
  
  try {
    // Call AvatarTalk API
    console.log(`📝 Text: "${welcomeText}"`);
    console.log(`👤 Avatar: ${avatar}`);
    
    const response = await fetch('https://api.avatartalk.ai/inference', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AVATARTALK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: welcomeText,
        avatar,
        emotion,
        language
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AvatarTalk API error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log(`📦 Response Content-Type: ${contentType}`);

    let videoBuffer: ArrayBuffer;

    // Check if response is JSON (contains video URL)
    if (contentType?.includes('application/json')) {
      const jsonData = await response.json();
      console.log('📄 JSON response received, extracting video URL...');
      
      const videoUrl = jsonData.mp4_url || jsonData.video_url || jsonData.url || jsonData.video || jsonData.result;
      
      if (!videoUrl) {
        throw new Error('No video URL found in AvatarTalk response');
      }
      
      console.log(`🔗 Fetching video from: ${videoUrl}`);
      
      // Fetch the actual video
      const videoResponse = await fetch(videoUrl);
      
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video from URL: ${videoResponse.status}`);
      }
      
      videoBuffer = await videoResponse.arrayBuffer();
    } else {
      // Direct video response
      videoBuffer = await response.arrayBuffer();
    }

    console.log(`✅ Video downloaded: ${videoBuffer.byteLength} bytes`);

    // Save to attached_assets/videos/welcome.mp4
    const outputPath = path.join(process.cwd(), 'attached_assets', 'videos', 'welcome.mp4');
    
    fs.writeFileSync(outputPath, Buffer.from(videoBuffer));
    
    console.log(`💾 Video saved to: ${outputPath}`);
    console.log('🎉 Welcome video generated successfully!');
    
  } catch (error: any) {
    console.error('❌ Error generating welcome video:', error);
    throw error;
  }
}

generateWelcomeVideo().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
