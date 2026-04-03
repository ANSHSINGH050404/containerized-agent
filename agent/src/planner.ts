import { GoogleGenAI } from "@google/genai";

export interface Step {
  type: "shell" | "ts";
  code: string;
}

// Bug #10 Fix: runtime type guard so malformed Gemini responses are caught early
function isValidSteps(data: unknown): data is Step[] {
  return (
    Array.isArray(data) &&
    data.every(
      (s) =>
        (s.type === "shell" || s.type === "ts") && typeof s.code === "string"
    )
  );
}

export class Planner {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async plan(userPrompt: string): Promise<Step[]> {
    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-pro-preview",
      contents: `Break this task into shell commands or TypeScript snippets.
                 Return ONLY a JSON array of steps: {"type":"shell"|"ts","code":"..."}[]
                 Task: ${userPrompt}`,
      config: {
        responseMimeType: "application/json",
        temperature: 0.1
      }
    });

    const text = response.text();
    if (!text) throw new Error("No response from Gemini");

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      const cleaned = text.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    if (!isValidSteps(parsed)) {
      throw new Error(
        `Planner returned invalid step schema. Expected Step[], got: ${JSON.stringify(parsed).slice(0, 200)}`
      );
    }

    return parsed;
  }
}
