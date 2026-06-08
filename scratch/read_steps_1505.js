const fs = require('fs');

const logPath = 'C:/Users/hp/.gemini/antigravity/brain/e3f23442-ff14-424c-bc2e-7a1b0b17173f/.system_generated/logs/transcript.jsonl';

const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (const line of lines) {
  if (!line) continue;
  try {
    const parsed = JSON.parse(line);
    // Find steps around timestamp 15:05 (Step 210 was 15:05:21Z)
    if (parsed.created_at && parsed.created_at.includes('15:05') || parsed.created_at.includes('15:04')) {
      console.log(`--- Step ${parsed.step_index} (${parsed.created_at}) source=${parsed.source} type=${parsed.type} ---`);
      if (parsed.content) console.log(parsed.content.slice(0, 1000));
      if (parsed.tool_calls) console.log(JSON.stringify(parsed.tool_calls, null, 2));
      console.log('\n');
    }
  } catch (e) {}
}
