import { $ } from "bun";
import { unlink } from "node:fs/promises";
import type { Step } from "./planner.ts";

export class Executor {
  async execute(steps: Step[]) {
    for (const step of steps) {
      console.log(`\x1b[34m[agent]\x1b[0m running ${step.type}: ${step.code}`);
      
      try {
        if (step.type === "shell") {
          // Execute using sh to properly interpret pipelines/redirections just like execSync
          await $`sh -c ${step.code}`;
        } else {
          const tempFile = `/tmp/agent_step_${Date.now()}.ts`;
          try {
            await Bun.write(tempFile, step.code);
            await $`bun run ${tempFile}`;
          } finally {
            const file = Bun.file(tempFile);
            if (await file.exists()) {
              await unlink(tempFile);
            }
          }
        }
      } catch (err) {
        console.error(`\x1b[31m[error]\x1b[0m Step failed: ${step.code}`);
        throw err;
      }
    }
  }
}
