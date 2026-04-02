import { GoogleGenAI } from "@google/genai";

export interface Step {
  type: "shell" | "ts";
  code: string;
}

export class Planner {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async plan(userPrompt: string): Promise<Step[]> {
    const response = await this.ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: `Break this task into shell commands or TypeScript snippets.
                 Return ONLY a JSON array of steps: {"type":"shell"|"ts","code":"..."}[]
                 Task: ${userPrompt}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    try {
      return JSON.parse(text);
    } catch (e) {
      const cleaned = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleaned);
    }
  }
}
