import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
    contents: JSON.stringify([{ fullName: "AbdelRahman Al Sayed", scheduleEntries: [{ date: '2026-07-05', text: '7 AM to 4 PM' }, { date: '2026-07-06', text: 'Off' }] }]),
    config: {
      systemInstruction: "You are an expert workforce management AI...",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            fullName: { type: Type.STRING },
            schedules: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  date: { type: Type.STRING },
                  shiftType: { type: Type.STRING },
                  startTime: { type: Type.STRING, nullable: true },
                  endTime: { type: Type.STRING, nullable: true },
                  breaks: { type: Type.ARRAY, items: { type: Type.STRING } },
                  lunch: { type: Type.STRING, nullable: true }
                }
              }
            }
          }
        }
      }
    }
  });
  console.log(response.text);
}
run();
