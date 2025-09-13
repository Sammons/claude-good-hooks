/**
 * Ask yes/no question with default value using readline
 */

import { createInterface } from 'readline';

export function askYesNo(question: string, defaultValue: boolean): Promise<boolean> {
  return new Promise(resolve => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question(question, answer => {
      rl.close();
      if (!answer.trim()) {
        resolve(defaultValue);
      } else {
        resolve(answer.toLowerCase().startsWith('y'));
      }
    });
  });
}
