import { GoogleGenAI } from "@google/genai";
import fs from "fs";
const key = fs.readFileSync(".env.local","utf8").match(/^GEMINI_API_KEY=(.+)$/m)[1].trim();
const ai = new GoogleGenAI({ apiKey: key });
const models = ["gemini-3.8-flash","gemini-3.7-flash","gemini-3.6-flash","gemini-3.5-flash","gemini-3.5-flash-lite","gemini-3.1-flash-lite","gemini-3-flash-preview","gemini-2.5-flash","gemini-flash-lite-latest","gemini-flash-latest"];
const results = [];
for (const model of models) {
  const times = []; let err = null;
  for (let i = 0; i < 2; i++) {
    const t = Date.now();
    try {
      const cfg = { maxOutputTokens: 60 };
      let r;
      try { r = await ai.models.generateContent({ model, contents: "In one sentence, what is a fixed deposit?", config: { ...cfg, thinkingConfig: { thinkingBudget: 0 } } }); }
      catch (e) { if (/400|INVALID_ARGUMENT/.test(String(e.message))) r = await ai.models.generateContent({ model, contents: "In one sentence, what is a fixed deposit?", config: cfg }); else throw e; }
      times.push(Date.now() - t);
    } catch (e) { err = String(e.message).match(/"code":\s*(\d+)/)?.[1] || e.message.slice(0,40); break; }
  }
  results.push({ model, err, times });
  console.log(model.padEnd(26), err ? "ERR " + err : "ok  " + times.map(x => x + "ms").join(" / "));
}
