/**
 * Ask a question and return the response
 */

import { createInterface } from 'readline';

export function askQuestion(question: string): Promise<string> {
  return new Promise(resolve => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}