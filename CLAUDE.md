# Claude Good Hooks - Documentation Links

This file contains links to all README documentation files in the repository.

The Anthropic Docs on Claude Code Hooks: @./.claude/docs/hooks.md

## Main Documentation

### Code Outline

The code structure outline is available at: @./.claude/code-outline.md

- [Main README](./README.md) - Project overview and getting started guide

## Package Documentation

### Core Packages
- [CLI Package](./packages/claude-good-hooks-cli/README.md) - Command-line interface for Claude Good Hooks
- [Types Package](./packages/claude-good-hooks-types/README.md) - TypeScript type definitions

### Example and Template Packages
- [Examples](./packages/claude-good-hooks-examples/README.md) - Example hook implementations
- [Template Hook](./packages/claude-good-hooks-template-hook/README.md) - Template for creating new hooks
- [Dirty Good Claude Hook](./packages/dirty-good-claude-hook/README.md) - Git status hook implementation
- [Code Outline Hook](./packages/claude-good-hooks-code-outline/README.md) - Code structure analysis hook

### Testing and Website
- [Smoke Tests](./packages/claude-good-hooks-smoke-tests/README.md) - Smoke test suite
- [Landing Page](./packages/landing-page/README.md) - Project landing page

### Additional Documentation
- [CLI Errors Documentation](./packages/claude-good-hooks-cli/src/errors/README.md) - Error handling in the CLI

### Original Prompt

1. This repo is meant to be a CLI named 'claude-good-hooks' written in TypeScript and Node 22+
  2. The commands it will expose are like this:
    a. claude-good-hooks help
    b. claude-good-hooks list-hooks # by default lists all, --installed shows installed locally and for --project by default, --project, --installed --globally changes that to
   show globally installed (flags may be mixed)
    c. claude-good-hooks remote --add <npm-module-name> # for undo, supports --remove, the related module must installed locally or globally first
    d. claude-good-hooks apply --global <npm-package-name> # sets up hook with default params, globally
    e. claude-good-hooks apply --global <npm-package-name> --help # outputs help, including custom args supported by hook
    f. claude-good-hooks apply --project <npm-package-name> # sets up hook with default params, in the current directory
    g. claude-good-hooks apply --project <npm-package-name>/variant # apply specific hook variant via deep import
    h. claude-good-hooks apply --project @sammons/dirty-good-claude-hook --staged --filenames # example with args
    i. claude-good-hooks apply --local @sammons/dirty-good-claude-hook --diffs # example hook that outputs unstaged changes
    j. claude-good-hooks update # updates itself via npm install -g
    k. claude-good-hooks doctor # detects if missing from the PATH
    l. claude-good-hooks version # outputs current version
    m. for all commands, support --json so that jq and bash scripts can use it
  3. git init this repo
  4. update the name in the package to be @sammons/claude-good-hooks
  5. a hook ought to have a HookPlugin export from its module entrypoint, which has properties .matcher and .hooks per https://docs.anthropic.com/en/docs/claude-code/hooks
  6. this is a monorepo
    - ./packages/claude-good-hooks-cli # @sammons/claude-good-hooks
    - ./packages/claude-good-hooks-types # @sammons/claude-good-hooks-types
    - ./packages/claude-good-hooks-template-hook # @sammons/claude-good-hooks-template-hook, to act as npm template
    - ./packages/dirty-hook # @sammons/dirty-good-claude-hook # consumes types, and exports a HookPlugin
  7. some additional points:
    - applying globally, the referenced module must be installed globally already via npm, and if it is not, then a clear warning should be shown indicating that it needs to 
  be installed
    - applying locally, the referenced module may be installed locally or globally via npm
    - we can detect existing hooks seamlessly, we use:
      + ~/.claude/settings.json # --global hooks
      + ./.claude/settings.json # --project hooks
      + ./.claude/settings.local.json # --local hooks
  8. we want to use vitest for tests, and tsup for building
  9. we want to use modern flat eslint config (research this) including prettier and typescript plugins for linting
  10. we will use pnpm for the monorepo
  11. There will be a README.md
    - Introduction: explaining in terse no-nonsense that this is a CLI for configuring hooks and using hooks shared via npm which adhere to the claude good hooks interface
    - Getting Started: showing the step by step install and usage of the dirty hook
    - Publishing Your Own Hook: showing the step by step instructions of authoring your own hook
    - Contributing: reference a CONTRIBUTING.md which should be very terse, just explaining that contributions are welcome but to keep tests and linting passing and to follow 
  semver
    - Sponsorship: Buy me a coffee placeholder link, I will put a stripe link
    - License: MIT License blurb

### Development Conventions

These are strong suggestions for maintaining clean, maintainable code.

#### R1. Minimize Excessive Parameter Passing

No more than 3 parameters should be passed to a function before converting to a parameter object, conventionally named 'params'.

**❌ Bad:**
```typescript
function createHook(name: string, type: string, command: string, timeout: number, retries: number, async: boolean) {
  // Too many parameters make the function hard to call and understand
}

// Calling this is error-prone
createHook('pre-commit', 'bash', 'npm test', 30000, 3, true);
```

**✅ Good:**
```typescript
interface CreateHookParams {
  name: string;
  type: string;
  command: string;
  timeout?: number;
  retries?: number;
  async?: boolean;
}

function createHook(params: CreateHookParams) {
  const { name, type, command, timeout = 30000, retries = 3, async = false } = params;
  // Clear, extensible, and self-documenting
}

// Calling is clear and order-independent
createHook({ 
  name: 'pre-commit',
  type: 'bash',
  command: 'npm test',
  async: true 
});
```

#### R2. Prefer Classes for Related Functions

When exporting multiple functions from the same file which could be combined into a class, use a class. This is especially powerful when you can inject dependencies through the constructor.

**❌ Bad:**
```typescript
// sqs-utils.ts
import { SQSClient } from '@aws-sdk/client-sqs';

export async function publishMessage(client: SQSClient, queueUrl: string, message: string, attributes?: Record<string, any>) {
  // Every function needs the client passed in
}

export async function describeQueue(client: SQSClient, queueUrl: string) {
  // Repetitive client parameter
}

export async function purgeQueue(client: SQSClient, queueUrl: string) {
  // Client parameter again
}

export async function getQueueAttributes(client: SQSClient, queueUrl: string, attributeNames: string[]) {
  // And again...
}

// Usage is verbose and error-prone
import { publishMessage, describeQueue, purgeQueue } from './sqs-utils';
const client = new SQSClient({ region: 'us-east-1' });
await publishMessage(client, queueUrl, 'Hello');
await describeQueue(client, queueUrl);
```

**✅ Good:**
```typescript
// sqs-service.ts
import { SQSClient } from '@aws-sdk/client-sqs';

export class SQSService {
  constructor(private readonly client: SQSClient) {}
  
  async publishMessage(queueUrl: string, message: string, attributes?: Record<string, any>) {
    // Client is available via this.client
  }
  
  async describeQueue(queueUrl: string) {
    // No need to pass client
  }
  
  async purgeQueue(queueUrl: string) {
    // Clean method signature
  }
  
  async getQueueAttributes(queueUrl: string, attributeNames: string[]) {
    // Focused on business logic, not boilerplate
  }
}

// Usage is clean and the client is configured once
import { SQSService } from './sqs-service';
const sqsService = new SQSService(new SQSClient({ region: 'us-east-1' }));
await sqsService.publishMessage(queueUrl, 'Hello');
await sqsService.describeQueue(queueUrl);
```

#### R3. Replace Switch Cases with Polymorphic Classes

Instead of switch cases, prefer classes with `.match()` methods, and enumerating and matching on the input. Use duck-typing rather than abstract classes - TypeScript will enforce the contract through usage.

**❌ Bad:**
```typescript
function processCommand(command: string, args: any) {
  switch (command) {
    case 'init':
      return initializeProject(args);
    case 'build':
      return buildProject(args);
    case 'test':
      return runTests(args);
    default:
      throw new Error(`Unknown command: ${command}`);
  }
}
```

**✅ Good:**
```typescript
class InitCommand {
  match(command: string): boolean {
    return command === 'init';
  }
  
  async execute(args: any): Promise<void> {
    // Initialize project
  }
}

class BuildCommand {
  match(command: string): boolean {
    return command === 'build';
  }
  
  async execute(args: any): Promise<void> {
    // Build project
  }
}

class TestCommand {
  match(command: string): boolean {
    return command === 'test';
  }
  
  async execute(args: any): Promise<void> {
    // Run tests
  }
}

class CommandProcessor {
  // Duck-typing: TypeScript enforces that all items have .match() and .execute()
  // No need for abstract class or interface
  private commands = [
    new InitCommand(),
    new BuildCommand(),
    new TestCommand(),
  ];
  
  async process(command: string, args: any): Promise<void> {
    // This won't compile if any command is missing .match()
    const cmd = this.commands.find(c => c.match(command));
    if (!cmd) throw new Error(`Unknown command: ${command}`);
    // This won't compile if any command is missing .execute()
    return cmd.execute(args);
  }
}
```

#### R4. Avoid Mutable Variables with `let`

`let` indicates we could refactor to a function with return statements. Prefer `const` and functional approaches. Exception: `.reduce()` can be less readable than a loop with mutation - in those cases, mutating a `const` array or accumulator in a focused function is acceptable.

**❌ Bad:**
```typescript
function processData(items: Item[]): ProcessResult {
  let total = 0;
  let errors = [];
  let processed = [];
  
  for (const item of items) {
    if (item.isValid) {
      processed.push(item);
      total += item.value;
    } else {
      errors.push(item.error);
    }
  }
  
  // Multiple lets scattered throughout
  let result = { total, errors, processed };
  return result;
}
```

**✅ Good (using const with mutation for clarity):**
```typescript
function processData(items: Item[]): ProcessResult {
  const processed: Item[] = [];
  const errors: string[] = [];
  let total = 0; // Single let for simple accumulation is OK
  
  for (const item of items) {
    if (item.isValid) {
      processed.push(item); // Mutating const array is fine
      total += item.value;
    } else {
      errors.push(item.error);
    }
  }
  
  return { total, errors, processed };
}
```

**✅ Also Good (functional approach when it's clearer):**
```typescript
function processData(items: Item[]): ProcessResult {
  const validItems = items.filter(item => item.isValid);
  const errors = items
    .filter(item => !item.isValid)
    .map(item => item.error);
  const total = validItems
    .map(item => item.value)
    .reduce((sum, value) => sum + value, 0);
  
  return { total, errors, processed: validItems };
}
```

**Note on `.reduce()`**: While reduce is powerful, it can hurt readability for complex accumulations. Compare:

```typescript
// Hard to read reduce
const result = items.reduce((acc, item) => ({
  ...acc,
  total: acc.total + item.value,
  items: [...acc.items, item],
  errors: item.error ? [...acc.errors, item.error] : acc.errors
}), { total: 0, items: [], errors: [] });

// Clearer with const mutation
const result = { total: 0, items: [], errors: [] };
for (const item of items) {
  result.total += item.value;
  result.items.push(item);
  if (item.error) result.errors.push(item.error);
}
```

#### R5. Prefer Duck-Typing Over Explicit Interfaces

Avoid using interfaces or abstract classes to declare contracts that classes adhere to. TypeScript's structural typing (duck-typing) provides type safety through usage patterns.

**❌ Bad:**
```typescript
interface Logger {
  log(message: string): void;
  error(message: string): void;
  warn(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void { console.log(message); }
  error(message: string): void { console.error(message); }
  warn(message: string): void { console.warn(message); }
}

class FileLogger implements Logger {
  log(message: string): void { /* write to file */ }
  error(message: string): void { /* write to file */ }
  warn(message: string): void { /* write to file */ }
}

// Unnecessary interface constraint
function processWithLogging(logger: Logger, data: any) {
  logger.log('Processing started');
  // process data
  logger.log('Processing complete');
}
```

**✅ Good:**
```typescript
class ConsoleLogger {
  log(message: string) { console.log(message); }
  error(message: string) { console.error(message); }
  warn(message: string) { console.warn(message); }
}

class FileLogger {
  log(message: string) { /* write to file */ }
  error(message: string) { /* write to file */ }
  warn(message: string) { /* write to file */ }
}

// Duck-typing: any object with .log() method works
function processWithLogging(logger: { log(message: string): void }, data: any) {
  logger.log('Processing started');
  // process data
  logger.log('Processing complete');
}

// Or even better, let TypeScript infer from usage
class DataProcessor {
  constructor(private logger = new ConsoleLogger()) {}
  
  process(data: any) {
    // TypeScript knows logger must have .log() from how it's used
    this.logger.log('Processing started');
    // process data
    this.logger.log('Processing complete');
  }
}

// This pattern also enables easier testing with simple objects
const testLogger = { 
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn()
};
const processor = new DataProcessor(testLogger);
```

#### R6. Use Vitest Instead of Jest

Prefer Vitest over Jest for testing. Vitest offers better TypeScript support, faster execution, and native ESM support without configuration overhead.

**❌ Bad:**
```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // Lots of configuration needed
};

// test.spec.ts
import { jest } from '@jest/globals';

describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should mock correctly', () => {
    const mockFn = jest.fn();
    mockFn.mockReturnValue(42);
    expect(mockFn()).toBe(42);
  });
});
```

**✅ Good:**
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true, // Optional: enables global test APIs
  },
  // Minimal configuration, works out of the box
});

// test.spec.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('UserService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should mock correctly', () => {
    const mockFn = vi.fn();
    mockFn.mockReturnValue(42);
    expect(mockFn()).toBe(42);
  });

  // Vitest-specific features
  it('should support inline tests', () => {
    expect(sum(1, 2)).toBe(3);
  });
});

// Vitest also supports in-source testing
// math.ts
export function sum(a: number, b: number): number {
  return a + b;
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;
  it('sum adds numbers', () => {
    expect(sum(1, 2)).toBe(3);
  });
}
```

#### R7. Split Tests Into Focused Files Instead of Deep Nesting

Reduce describe block nesting by breaking tests into multiple files with `.<description>.test.ts` suffixes. This improves test organization, readability, and makes test failures easier to locate.

**❌ Bad:**
```typescript
// user.test.ts - Single file with deep nesting
describe('UserService', () => {
  describe('authentication', () => {
    describe('login', () => {
      describe('with valid credentials', () => {
        it('should return a token', () => { /* ... */ });
        it('should set last login time', () => { /* ... */ });
      });
      
      describe('with invalid credentials', () => {
        it('should throw unauthorized error', () => { /* ... */ });
        it('should increment failed attempts', () => { /* ... */ });
      });
    });
    
    describe('logout', () => {
      it('should clear the session', () => { /* ... */ });
      it('should revoke the token', () => { /* ... */ });
    });
  });
  
  describe('profile management', () => {
    describe('update profile', () => {
      it('should update user data', () => { /* ... */ });
      it('should validate email format', () => { /* ... */ });
    });
    
    describe('delete account', () => {
      it('should soft delete the user', () => { /* ... */ });
      it('should cancel subscriptions', () => { /* ... */ });
    });
  });
});
```

**✅ Good:**
```typescript
// user.login-valid.test.ts
describe('UserService login with valid credentials', () => {
  it('should return a token', () => { /* ... */ });
  it('should set last login time', () => { /* ... */ });
});

// user.login-invalid.test.ts
describe('UserService login with invalid credentials', () => {
  it('should throw unauthorized error', () => { /* ... */ });
  it('should increment failed attempts', () => { /* ... */ });
});

// user.logout.test.ts
describe('UserService logout', () => {
  it('should clear the session', () => { /* ... */ });
  it('should revoke the token', () => { /* ... */ });
});

// user.profile.test.ts
describe('UserService profile management', () => {
  it('should update user data', () => { /* ... */ });
  it('should validate email format', () => { /* ... */ });
});

// user.deletion.test.ts
describe('UserService account deletion', () => {
  it('should soft delete the user', () => { /* ... */ });
  it('should cancel subscriptions', () => { /* ... */ });
```

**File naming convention:**
- `user.test.ts` - General/basic tests
- `user.authentication.test.ts` - Authentication-specific tests
- `user.profile.test.ts` - Profile management tests
- `user.deletion.test.ts` - Account deletion tests
- `user.edge-cases.test.ts` - Edge cases and error scenarios

This approach:
- Makes test output cleaner and easier to scan
- Allows running specific test suites with glob patterns: `vitest user.auth*`
- Improves IDE navigation and file search
- Keeps each test file focused on a single concern

#### R8. Use Kebab-Case for Filenames

Use kebab-case for all filenames to make search easier and differentiate between file imports and class names. This prevents confusion when searching for symbols vs files.

**❌ Bad:**
```typescript
// File structure with mixed casing
src/
  UserService.ts
  AuthenticationMiddleware.ts
  DatabaseConnection.ts
  userUtils.ts
  API_Client.ts

// Searching becomes ambiguous
// Search: "UserService" - Is this the class or the file?
// Search: "authenticationMiddleware" - Different from filename

// Imports are inconsistent with class names
import { UserService } from './UserService';  // File and class name identical
import { AuthMiddleware } from './AuthenticationMiddleware';  // Names differ
```

**✅ Good:**
```typescript
// File structure with kebab-case
src/
  user-service.ts
  authentication-middleware.ts
  database-connection.ts
  user-utils.ts
  api-client.ts

// Clear distinction in searches
// Search: "UserService" - Looking for the class
// Search: "user-service" - Looking for the file

// Imports clearly show file vs export
import { UserService } from './user-service';
import { AuthenticationMiddleware } from './authentication-middleware';
import { DatabaseConnection } from './database-connection';
import { validateUser, formatUser } from './user-utils';
import { APIClient } from './api-client';
```

**Benefits:**
- **Clear search intent**: `UserService` finds the class, `user-service` finds the file
- **Consistent URLs**: Kebab-case matches web URLs if files are served
- **Cross-platform**: Avoids case-sensitivity issues between filesystems
- **Better autocomplete**: Typing lowercase gives file suggestions, PascalCase gives class suggestions

**Apply to all file types:**
```typescript
// Components
user-profile.component.tsx
navigation-bar.component.tsx

// Tests  
user-service.test.ts
user-service.integration.test.ts

// Configurations
vitest.config.ts
database.config.ts

// Types/Interfaces
user.types.ts
api.interfaces.ts
```

#### R9. Return DTOs, Not Entity Classes with Methods

Methods should return plain Data Transfer Objects (DTOs) that may adhere to interfaces or types, but should not be entity classes with methods. This keeps data and behavior separated and makes serialization/deserialization straightforward.

**❌ Bad:**
```typescript
// Returning entities with methods causes issues
class User {
  constructor(
    public id: string,
    public email: string,
    private passwordHash: string,
    public createdAt: Date
  ) {}
  
  validatePassword(password: string): boolean {
    return bcrypt.compare(password, this.passwordHash);
  }
  
  getDisplayName(): string {
    return this.email.split('@')[0];
  }
  
  toJSON() {
    // Custom serialization logic needed
    const { passwordHash, ...data } = this;
    return data;
  }
}

class UserService {
  async getUser(id: string): Promise<User> {
    const data = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    // Returning an entity with methods
    return new User(data.id, data.email, data.passwordHash, data.createdAt);
  }
}

// Problems arise with serialization
const user = await userService.getUser('123');
JSON.stringify(user); // Loses methods, might expose passwordHash
```

**✅ Good:**
```typescript
// Plain interface for return type
interface User {
  id: string;
  email: string;
  createdAt: Date;
  displayName: string;
}

// Separate type for internal database data
interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
}

class UserService {
  async getUser(id: string): Promise<User> {
    const data = await db.query<UserRecord>('SELECT * FROM users WHERE id = ?', [id]);
    
    // Return plain object matching interface
    return {
      id: data.id,
      email: data.email,
      createdAt: data.createdAt,
      displayName: data.email.split('@')[0]
    };
  }
  
  // Business logic stays in service
  async validatePassword(userId: string, password: string): Promise<boolean> {
    const data = await db.query<UserRecord>('SELECT passwordHash FROM users WHERE id = ?', [userId]);
    return bcrypt.compare(password, data.passwordHash);
  }
}

// Clean serialization
const user = await userService.getUser('123');
JSON.stringify(user); // Works perfectly, no surprises
```

**Benefits:**
- **Clean serialization**: DTOs serialize to JSON without custom logic
- **Type safety**: TypeScript ensures DTOs match their interfaces
- **Separation of concerns**: Data structure separate from business logic
- **API compatibility**: DTOs map directly to API responses
- **Testability**: Easy to create test data as plain objects

#### R10. Use `satisfies` for Type-Safe Object Literals

Use `satisfies` instead of type annotations to maintain literal inference while ensuring type safety. This preserves autocomplete and prevents widening.

**❌ Bad:**
```typescript
// Type annotation loses literal types
const routes: Record<string, string> = {
  home: '/',
  about: '/about',
  contact: '/contact'
};

// No autocomplete, type is just string
const homeRoute = routes.home; // string

// Can accidentally add invalid properties
const config: { port: number; host: string } = {
  port: 3000,
  host: 'localhost',
  invalidProp: true // TypeScript doesn't catch this with excess property checks in some contexts
};
```

**✅ Good:**
```typescript
// Using satisfies preserves literal types
const routes = {
  home: '/',
  about: '/about',
  contact: '/contact'
} satisfies Record<string, string>;

// Full autocomplete and literal type
const homeRoute = routes.home; // "/"

// Ensures type safety while keeping literals
const config = {
  port: 3000,
  host: 'localhost',
  // invalidProp: true // TypeScript error: not in expected shape
} satisfies { port: number; host: string };

// Especially powerful for const assertions with validation
const commands = {
  init: { description: 'Initialize project' },
  build: { description: 'Build project' },
  test: { description: 'Run tests' }
} as const satisfies Record<string, { description: string }>;

type Command = keyof typeof commands; // "init" | "build" | "test"
```

#### R11. Prefer Type Predicates Over Type Assertions

Replace `as` casts with type guard functions that return type predicates. This provides runtime safety alongside compile-time types.

**❌ Bad:**
```typescript
function processUser(data: unknown) {
  // Dangerous: no runtime validation
  const user = data as User;
  console.log(user.email); // Might crash at runtime
}

// Lying to TypeScript
const numbers = [1, 2, null, 3, undefined, 4];
const filtered = numbers.filter(n => n !== null && n !== undefined) as number[];
// TypeScript trusts us, but we might be wrong

// Multiple assertions = code smell
const config = JSON.parse(configStr) as unknown as ConfigType;
```

**✅ Good:**
```typescript
// Type predicate with runtime validation
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'email' in data &&
    typeof data.email === 'string'
  );
}

function processUser(data: unknown) {
  if (isUser(data)) {
    console.log(data.email); // Safe: TypeScript knows this is User
  } else {
    throw new Error('Invalid user data');
  }
}

// Type predicate for filtering
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

const numbers = [1, 2, null, 3, undefined, 4];
const filtered = numbers.filter(isDefined); // number[], safely typed and validated

// Parse with validation
function parseConfig(configStr: string): Config {
  const data = JSON.parse(configStr);
  if (isValidConfig(data)) {
    return data;
  }
  throw new Error('Invalid config');
}
```

#### R12. Avoid Barrel Exports (index.ts Re-exports)

Don't use index.ts files that re-export everything. Import directly from source files to prevent circular dependencies and improve tree-shaking.

**❌ Bad:**
```typescript
// services/index.ts
export * from './user-service';
export * from './auth-service';
export * from './payment-service';
export * from './email-service';

// components/index.ts
export { UserProfile } from './user-profile';
export { Navigation } from './navigation';
export { Footer } from './footer';

// Usage creates unclear dependencies
import { UserService, AuthService, EmailService } from './services';
// Where do these come from? What if services import each other?
```

**✅ Good:**
```typescript
// No index.ts barrel files - import directly
import { UserService } from './services/user-service';
import { AuthService } from './services/auth-service';
import { EmailService } from './services/email-service';

// Clear dependency graph
import { UserProfile } from './components/user-profile';
import { Navigation } from './components/navigation';

// If you must group exports, use a specific module file
// services/authentication.ts (not index.ts)
export { AuthService } from './auth-service';
export { TokenService } from './token-service';
export type { AuthConfig } from './auth-types';
```

**Benefits:**
- **Faster builds**: Better tree-shaking and dead code elimination
- **Clear dependencies**: Know exactly where imports come from
- **Avoid circular deps**: Direct imports make cycles obvious
- **Better code splitting**: Bundlers can optimize better

#### R13. Use Discriminated Unions for Error Handling

Return discriminated unions instead of throwing errors. This makes error handling explicit and type-safe.

**❌ Bad:**
```typescript
class UserService {
  async getUser(id: string): Promise<User> {
    const user = await db.findUser(id);
    if (!user) {
      throw new Error('User not found');
    }
    if (!user.isActive) {
      throw new Error('User is inactive');
    }
    return user;
  }
}

// Caller has no idea what errors to expect
try {
  const user = await userService.getUser('123');
  console.log(user);
} catch (error) {
  // What kind of error? How to handle it?
  console.error(error);
}
```

**✅ Good:**
```typescript
// Discriminated union for results
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

type UserError = 
  | { type: 'NOT_FOUND'; userId: string }
  | { type: 'INACTIVE'; userId: string }
  | { type: 'DB_ERROR'; message: string };

class UserService {
  async getUser(id: string): Promise<Result<User, UserError>> {
    try {
      const user = await db.findUser(id);
      
      if (!user) {
        return { 
          success: false, 
          error: { type: 'NOT_FOUND', userId: id } 
        };
      }
      
      if (!user.isActive) {
        return { 
          success: false, 
          error: { type: 'INACTIVE', userId: id } 
        };
      }
      
      return { success: true, data: user };
    } catch (error) {
      return { 
        success: false, 
        error: { type: 'DB_ERROR', message: String(error) } 
      };
    }
  }
}

// Caller must handle all error cases
const result = await userService.getUser('123');

if (result.success) {
  console.log(result.data); // TypeScript knows this is User
} else {
  // TypeScript knows all possible error types
  switch (result.error.type) {
    case 'NOT_FOUND':
      console.log(`User ${result.error.userId} not found`);
      break;
    case 'INACTIVE':
      console.log(`User ${result.error.userId} is inactive`);
      break;
    case 'DB_ERROR':
      console.log(`Database error: ${result.error.message}`);
      break;
  }
}
```

#### R14. Prefer `unknown` Over `any` in Catch Blocks

Use `unknown` in catch blocks and narrow the type with guards or validation.

**❌ Bad:**
```typescript
try {
  await riskyOperation();
} catch (error) {
  // error is implicitly 'any'
  console.log(error.message); // Unsafe property access
  console.log(error.code); // Might not exist
  
  if (error.isNetworkError) { // No type checking
    retryOperation();
  }
}

// Casting to Error assumes too much
try {
  await parseJSON(input);
} catch (error) {
  const e = error as Error; // What if it's not an Error?
  logger.error(e.message);
}
```

**✅ Good:**
```typescript
try {
  await riskyOperation();
} catch (error: unknown) {
  // Must narrow the type before use
  if (error instanceof Error) {
    console.log(error.message); // Safe
    
    // Further narrowing for specific error types
    if (error instanceof NetworkError) {
      retryOperation();
    }
  } else if (typeof error === 'string') {
    console.log(error);
  } else {
    console.log('Unknown error:', String(error));
  }
}

// Helper function for error narrowing
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return 'Unknown error occurred';
}

try {
  await parseJSON(input);
} catch (error: unknown) {
  logger.error(getErrorMessage(error));
}
```

#### R15. Use Const Assertions and Template Literal Types

Use `as const` and template literal types for compile-time validation of string patterns.

**❌ Bad:**
```typescript
// Loose typing, no autocomplete
const ROUTES = {
  users: '/api/users',
  posts: '/api/posts',
  comments: '/api/comments'
};

type Route = string; // Too broad

// No compile-time validation
function buildUrl(route: string, id?: string): string {
  return id ? `${route}/${id}` : route;
}

// String unions without const assertion
const EVENTS = ['click', 'focus', 'blur'];
type EventType = 'click' | 'focus' | 'blur'; // Manually maintained
```

**✅ Good:**
```typescript
// Const assertion for literal types
const ROUTES = {
  users: '/api/users',
  posts: '/api/posts',
  comments: '/api/comments'
} as const;

type Route = typeof ROUTES[keyof typeof ROUTES]; // '/api/users' | '/api/posts' | '/api/comments'

// Template literal types for validation
type ApiRoute = `/api/${string}`;
type RouteWithId<T extends string> = `${T}/${string}`;

function buildUrl<T extends ApiRoute>(route: T, id?: string): T | RouteWithId<T> {
  return id ? `${route}/${id}` as RouteWithId<T> : route;
}

// Const assertion for arrays
const EVENTS = ['click', 'focus', 'blur'] as const;
type EventType = typeof EVENTS[number]; // 'click' | 'focus' | 'blur'

// Template literal types for patterns
type HexColor = `#${string}`;
type DataAttribute = `data-${string}`;

const theme = {
  primary: '#007bff',
  secondary: '#6c757d'
} as const satisfies Record<string, HexColor>;
```

#### R16. Use Dependency Injection Tokens Instead of Classes

Use Symbol tokens for dependency injection instead of class constructors. This improves minification and makes contracts explicit.

**❌ Bad:**
```typescript
// Using class constructors as DI keys
class Container {
  private services = new Map<any, any>();
  
  register<T>(serviceClass: new (...args: any[]) => T, instance: T): void {
    this.services.set(serviceClass, instance);
  }
  
  get<T>(serviceClass: new (...args: any[]) => T): T {
    return this.services.get(serviceClass);
  }
}

// Usage - class names don't minify well
container.register(UserService, new UserService());
container.register(AuthService, new AuthService());

const userService = container.get(UserService); // Uses class as key
```

**✅ Good:**
```typescript
// Symbol tokens for DI
const DI_TOKENS = {
  UserService: Symbol('UserService'),
  AuthService: Symbol('AuthService'),
  Database: Symbol('Database'),
  Logger: Symbol('Logger')
} as const;

type ServiceToken<T> = symbol & { __type?: T };

class Container {
  private services = new Map<symbol, any>();
  
  register<T>(token: ServiceToken<T>, factory: () => T): void {
    this.services.set(token, factory());
  }
  
  get<T>(token: ServiceToken<T>): T {
    const service = this.services.get(token);
    if (!service) {
      throw new Error(`Service not found for token: ${token.toString()}`);
    }
    return service;
  }
}

// Define tokens with types
const USER_SERVICE: ServiceToken<UserService> = DI_TOKENS.UserService;
const AUTH_SERVICE: ServiceToken<AuthService> = DI_TOKENS.AuthService;

// Registration with explicit contracts
container.register(USER_SERVICE, () => new UserService(container.get(DATABASE)));
container.register(AUTH_SERVICE, () => new AuthService());

// Type-safe retrieval
const userService = container.get(USER_SERVICE); // TypeScript knows this is UserService
```

#### R17. Validate at the Edge with Zod

Use Zod or similar runtime validation at system boundaries. Parse, don't validate.

**❌ Bad:**
```typescript
// Manual validation scattered throughout
class UserController {
  async createUser(req: Request): Promise<User> {
    const { email, password, age } = req.body;
    
    // Manual validation
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email');
    }
    if (!password || password.length < 8) {
      throw new Error('Invalid password');
    }
    if (age !== undefined && typeof age !== 'number') {
      throw new Error('Invalid age');
    }
    
    // Hope we validated everything correctly
    return this.userService.create({ email, password, age });
  }
}

// Trusting external data
function processConfig(configFile: string) {
  const config = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  // Using config without validation
  return connectDb(config.database.host, config.database.port);
}
```

**✅ Good:**
```typescript
import { z } from 'zod';

// Define schema once, get type for free
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().min(0).max(150).optional()
});

type CreateUserInput = z.infer<typeof CreateUserSchema>; // Auto-generated type

class UserController {
  async createUser(req: Request): Promise<User> {
    // Parse at the edge - throws with detailed errors if invalid
    const input = CreateUserSchema.parse(req.body);
    
    // input is fully typed and validated
    return this.userService.create(input);
  }
}

// Config validation
const ConfigSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number().int().positive(),
    username: z.string(),
    password: z.string()
  }),
  features: z.object({
    enableCache: z.boolean().default(true),
    maxConnections: z.number().int().default(10)
  })
});

function loadConfig(configFile: string): z.infer<typeof ConfigSchema> {
  const raw = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  return ConfigSchema.parse(raw); // Validates and provides defaults
}

// Environment variables with validation
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  PORT: z.string().transform(Number).pipe(z.number().positive()),
  DATABASE_URL: z.string().url()
});

const env = EnvSchema.parse(process.env); // Validated env with proper types
```

#### R18. Keep Parent Files Adjacent to Their Helper Directories

When a file needs multiple helper files, create a helper directory at the same level as the parent file, not containing it. The parent orchestrates its helpers.

**❌ Bad:**
```typescript
// Wrong: parent file inside its own helpers directory
src/
  toy-handlers/
    toy-processor.ts      // Parent file wrongly placed inside
    parse-toy.ts
    validate-toy.ts
    transform-toy.ts
    format-toy.ts

// Or this confusing structure
src/
  user-service/
    user-service.ts       // Is this the main file or a helper?
    user-validator.ts
    user-repository.ts
    user-transformer.ts

// Imports are confusing
// From toy-processor.ts:
import { parseToy } from './parse-toy';  // Looks like sibling, but it's actually a helper
```

**✅ Good:**
```typescript
// Correct: parent file at same level as its helpers directory
src/
  toy-processor.ts        // Parent file at root level
  toy-processor/          // Helper directory with same name prefix
    parse-toy.ts
    validate-toy.ts
    transform-toy.ts
    format-toy.ts

// Or with 'helpers' suffix for clarity
src/
  toy-processor.ts
  toy-processor-helpers/
    parse-toy.ts
    validate-toy.ts
    transform-toy.ts

// Clear relationship
src/
  user-service.ts         // Main service file
  user-service/           // Its helpers
    user-validator.ts
    user-repository.ts
    user-transformer.ts
    user-types.ts

// Imports clearly show the relationship
// From toy-processor.ts:
import { parseToy } from './toy-processor/parse-toy';
import { validateToy } from './toy-processor/validate-toy';

// From external files:
import { ToyProcessor } from './toy-processor';  // Clear what's the main export
import { parseToy } from './toy-processor/parse-toy';  // Clear what's a helper
```

**Benefits:**
- **Clear hierarchy**: Parent file is visually at the parent level
- **Easy discovery**: Can immediately identify the main file vs helpers
- **Natural imports**: Import paths reflect the actual relationship
- **Better refactoring**: Moving the feature means moving the file + its directory together

**Common patterns:**
```typescript
// Service pattern  
src/services/
  hook-service.ts         // Main service
  hook-service/           // Service helpers
    hook-parser.ts
    hook-validator.ts
    hook-cache.ts

// Component pattern
src/components/
  user-profile.tsx        // Main component
  user-profile/           // Component helpers
    user-avatar.tsx
    user-stats.tsx
    user-profile.styles.ts
```

**Exception for CLI Commands in this project:**
For CLI commands specifically, we use a different pattern where each command lives entirely within its own directory:

```typescript
// CLI Commands pattern (exception to R18)
src/commands/
  apply/                  // Command directory
    apply.ts              // Main command implementation  
    apply.command.ts      // Export file for command registry
    apply.*.test.ts       // Test files
    apply-*.ts            // Additional command files if needed
  
  validate/
    validate.ts           // Main command implementation
    validate.command.ts   // Export file for command registry  
    validate.test.ts      // Test files
```

This pattern is used because CLI commands are self-contained units that are registered via the command registry, making the directory structure clearer for command organization and preventing a proliferation of files at the commands root level.