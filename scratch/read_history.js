const fs = require('fs');
const path = require('path');

const logPath = 'C:/Users/hp/.gemini/antigravity/brain/e3f23442-ff14-424c-bc2e-7a1b0b17173f/.system_generated/logs/transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Total lines: ${lines.length}`);
  
  // Search for replace_file_content or write_to_file tool calls
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const parsed = JSON.parse(lines[i]);
      if (parsed.tool_calls) {
        for (const tc of parsed.tool_calls) {
          if (tc.name === 'replace_file_content' && tc.args.TargetFile && tc.args.TargetFile.includes('ServicePricesContext')) {
            console.log(`--- Step ${parsed.step_index} (${parsed.created_at}) ---`);
            console.log(`TargetFile: ${tc.args.TargetFile}`);
            console.log(`Instruction: ${tc.args.Instruction}`);
            console.log(`ReplacementContent:\n${tc.args.ReplacementContent}`);
            console.log('\n');
          }
        }
      }
    } catch (e) {
      // ignore
    }
  }
} catch (err) {
  console.error(err);
}
