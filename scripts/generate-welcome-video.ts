import fs from 'fs';
import path from 'path';

const AVATARTALK_API_KEY = process.env.AVATARTALK_API_KEY;

if (!AVATARTALK_API_KEY) {
  console.error('ERROR: AVATARTALK_API_KEY environment variable not set');
  process.exit(1);
}

async function generateWelcomeVideo() {
  console.log('🎬 Generating welcome video with AvatarTalk API...');
  
  const welcomeText = "How can I help you today? Ask me anything about UK taxes, HMRC regulations, and personal finance.";
  const avatar = 'european_woman';
  const emotion = 'neutral';
  
  try {
    // Call AvatarTalk API
    console.log(`📝 Text: "${welcomeText}"`);
    console.log(`👤 Avatar: ${avatar}`);
    
    const response = await fetch('https://avatartalk.ai/api/inference', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AVATARTALK_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: welcomeText,
        avatar,
        emotion,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AvatarTalk API error: ${response.status} - ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    console.log(`📦 Response Content-Type: ${contentType}`);

    // AvatarTalk returns JSON with an ID
    const jsonData = await response.json() as { id: string; status: string };
    console.log('📄 JSON response received, ID:', jsonData.id);
    
    // Construct video URL from the response ID
    const videoUrl = `https://avatartalk.ai/api/inference/${jsonData.id}/video.mp4`;
    console.log(`🔗 Fetching video from: ${videoUrl}`);
    
    // Fetch the actual video
    const videoResponse = await fetch(videoUrl);
    
    if (!videoResponse.ok) {
      throw new Error(`Failed to fetch video from URL: ${videoResponse.status}`);
    }
    
    const videoBuffer = await videoResponse.arrayBuffer();

    console.log(`✅ Video downloaded: ${videoBuffer.byteLength} bytes`);

    // Save to attached_assets/welcome-video.mp4
    const outputDir = path.join(process.cwd(), 'attached_assets');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputPath = path.join(outputDir, 'welcome-video.mp4');
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
