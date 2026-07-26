// Standalone smoke test for the Gemini API key. Run via:
//   npm run test:gemini
// which loads .env.local with Node's built-in --env-file flag (Node 20+),
// so no `dotenv` dependency is required.
const { GoogleGenAI } = require('@google/genai');

async function testGeminiAPI() {
  console.log('🧪 Testing Gemini API Key for Receipt Scanner...\n');

  // Check API key
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ Error: GEMINI_API_KEY not found in .env.local');
    console.error('\nPlease create .env.local with:');
    console.error('GEMINI_API_KEY=your_api_key_here\n');
    process.exit(1);
  }

  console.log(`📋 API Key found: ${apiKey.substring(0, 10)}...`);
  console.log('🔌 Connecting to Gemini AI...\n');

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    console.log('💬 Sending test message...\n');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: [{ 
        role: 'user', 
        parts: [{ text: 'Respond with: "Receipt Scanner API is ready!"' }] 
      }],
    });

    console.log('✅ SUCCESS!');
    console.log('Your Gemini API key is working correctly!\n');
    console.log('📨 Gemini Response:');
    console.log('━'.repeat(50));
    console.log(response.text);
    console.log('━'.repeat(50));
    console.log('\n✨ You\'re all set! Upload a receipt to test extraction.');
    console.log('\n📝 Model: gemini-2.0-flash-exp');
    console.log('📦 Package: @google/genai');
  } catch (error) {
    console.error('❌ ERROR');
    console.error('Failed to connect to Gemini API\n');
    console.error('Error Message:');
    console.error(error.message);
    console.error('\n💡 Possible issues:');
    console.error('   1. API key is invalid or expired');
    console.error('   2. API key doesn\'t have proper permissions');
    console.error('   3. Network connectivity issues');
    console.error('\n🔗 Get a valid API key from:');
    console.error('   https://makersuite.google.com/app/apikey');
    process.exit(1);
  }
}

testGeminiAPI();

