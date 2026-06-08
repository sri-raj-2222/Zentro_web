const fs = require('fs');

const logPath = 'C:/Users/hp/.gemini/antigravity/brain/e3f23442-ff14-424c-bc2e-7a1b0b17173f/.system_generated/logs/transcript.jsonl';

const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (const line of lines) {
  if (!line) continue;
  try {
    const parsed = JSON.parse(line);
    if (parsed.step_index === 340) {
      console.log(JSON.stringify(parsed, null, 2));
    }
  } catch (e) {}
}
