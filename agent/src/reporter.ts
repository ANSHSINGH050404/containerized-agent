export class Reporter {
  log(message: string) {
    console.log(`\x1b[36m[reporter]\x1b[0m ${message}`);
  }

  error(message: string) {
    console.error(`\x1b[31m[reporter error]\x1b[0m ${message}`);
  }

  success(message: string) {
    console.log(`\x1b[32m[reporter success]\x1b[0m ${message}`);
  }
}
