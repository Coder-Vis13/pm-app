"use strict";
// // Ollama fallback: fetch('http://localhost:11434/api/generate', { model: 'llama3.2', prompt })
// import { GoogleGenerativeAI } from '@google/generative-ai';
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
// const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
// export async function generateProjectInsights(facts: ProjectFacts): Promise<string> {
//   const prompt = `You are a project workflow analyst for software teams.
// Given these computed metrics (do not invent numbers):
// ${JSON.stringify(facts, null, 2)}
// Return JSON: { "summary": "...", "topRisks": [...], "recommendations": [...] }`;
//   const result = await model.generateContent(prompt);
//   return result.response.text();
// }
