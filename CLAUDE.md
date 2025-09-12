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
function createHook(name: string, type: string, command: string, timeout: number, retries: number, async: boolean) {}

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
}

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
export async function publishMessage(client: SQSClient, queueUrl: string, message: string, attributes?: Record<string, any>) {}
export async function describeQueue(client: SQSClient, queueUrl: string) {}
export async function purgeQueue(client: SQSClient, queueUrl: string) {}

const client = new SQSClient({ region: 'us-east-1' });
await publishMessage(client, queueUrl, 'Hello');
await describeQueue(client, queueUrl);
```

**✅ Good:**
```typescript
export class SQSService {
  constructor(private readonly client: SQSClient) {}
  
  async publishMessage(queueUrl: string, message: string, attributes?: Record<string, any>) {}
  async describeQueue(queueUrl: string) {}
  async purgeQueue(queueUrl: string) {}
  async getQueueAttributes(queueUrl: string, attributeNames: string[]) {}
}

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
  match(command: string): boolean { return command === 'init'; }
  async execute(args: any): Promise<void> {}
}

class BuildCommand {
  match(command: string): boolean { return command === 'build'; }
  async execute(args: any): Promise<void> {}
}

class CommandProcessor {
  private commands = [
    new InitCommand(),
    new BuildCommand(),
  ];
  
  async process(command: string, args: any): Promise<void> {
    const cmd = this.commands.find(c => c.match(command));
    if (!cmd) throw new Error(`Unknown command: ${command}`);
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
  
  let result = { total, errors, processed };
  return result;
}
```

**✅ Good (using const with mutation for clarity):**
```typescript
function processData(items: Item[]): ProcessResult {
  const processed: Item[] = [];
  const errors: string[] = [];
  let total = 0;
  
  for (const item of items) {
    if (item.isValid) {
      processed.push(item);
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

function processWithLogging(logger: Logger, data: any) {
  logger.log('Processing started');
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

function processWithLogging(logger: { log(message: string): void }, data: any) {
  logger.log('Processing started');
  logger.log('Processing complete');
}

class DataProcessor {
  constructor(private logger = new ConsoleLogger()) {}
  
  process(data: any) {
    this.logger.log('Processing started');
    this.logger.log('Processing complete');
  }
}

const testLogger = { log: vi.fn(), error: vi.fn(), warn: vi.fn() };
const processor = new DataProcessor(testLogger);
```

#### R6. Use Vitest Instead of Jest

Prefer Vitest over Jest for testing. Vitest offers better TypeScript support, faster execution, and native ESM support without configuration overhead.

**❌ Bad:**
```typescript
// jest.config.js - requires complex configuration
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: { '^.+\\.tsx?$': 'ts-jest' },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
};
```

**✅ Good:**
```typescript
// vitest.config.ts - minimal configuration
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { globals: true } });

// test.spec.ts
import { describe, it, expect, vi } from 'vitest';

describe('UserService', () => {
  it('should mock correctly', () => {
    const mockFn = vi.fn();
    mockFn.mockReturnValue(42);
    expect(mockFn()).toBe(42);
  });
});
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
        it('should return a token', () => {});
        it('should set last login time', () => {});
      });
    });
  });
});
```

**✅ Good:**
```typescript
// user.login-valid.test.ts
describe('UserService login with valid credentials', () => {
  it('should return a token', () => {});
  it('should set last login time', () => {});
});

// user.login-invalid.test.ts
describe('UserService login with invalid credentials', () => {
  it('should throw unauthorized error', () => {});
  it('should increment failed attempts', () => {});
});
```

Split test files by feature: `user.login.test.ts`, `user.profile.test.ts`, etc.

#### R8. Use Kebab-Case for Filenames

Use kebab-case for all filenames to make search easier and differentiate between file imports and class names. This prevents confusion when searching for symbols vs files.

**❌ Bad:**
```typescript
src/
  UserService.ts
  AuthenticationMiddleware.ts
  userUtils.ts
  API_Client.ts
```

**✅ Good:**
```typescript
src/
  user-service.ts
  authentication-middleware.ts
  user-utils.ts
  api-client.ts

import { UserService } from './user-service';
import { AuthenticationMiddleware } from './authentication-middleware';
```


#### R9. Return DTOs, Not Entity Classes with Methods

Methods should return plain Data Transfer Objects (DTOs) that may adhere to interfaces or types, but should not be entity classes with methods. This keeps data and behavior separated and makes serialization/deserialization straightforward.

**❌ Bad:**
```typescript
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
}

class UserService {
  async getUser(id: string): Promise<User> {
    const data = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    return new User(data.id, data.email, data.passwordHash, data.createdAt);
  }
}
```

**✅ Good:**
```typescript
interface User {
  id: string;
  email: string;
  createdAt: Date;
  displayName: string;
}

class UserService {
  async getUser(id: string): Promise<User> {
    const data = await db.query<UserRecord>('SELECT * FROM users WHERE id = ?', [id]);
    
    return {
      id: data.id,
      email: data.email,
      createdAt: data.createdAt,
      displayName: data.email.split('@')[0]
    };
  }
  
  async validatePassword(userId: string, password: string): Promise<boolean> {
    const data = await db.query<UserRecord>('SELECT passwordHash FROM users WHERE id = ?', [userId]);
    return bcrypt.compare(password, data.passwordHash);
  }
}
```


#### R10. Use `satisfies` for Type-Safe Object Literals

Use `satisfies` instead of type annotations to maintain literal inference while ensuring type safety. This preserves autocomplete and prevents widening.

**❌ Bad:**
```typescript
const routes: Record<string, string> = {
  home: '/',
  about: '/about',
  contact: '/contact'
};

const homeRoute = routes.home; // string, no autocomplete
```

**✅ Good:**
```typescript
const routes = {
  home: '/',
  about: '/about',
  contact: '/contact'
} satisfies Record<string, string>;

const homeRoute = routes.home; // "/"

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
  const user = data as User;
  console.log(user.email); // Might crash at runtime
}

const numbers = [1, 2, null, 3, undefined, 4];
const filtered = numbers.filter(n => n !== null && n !== undefined) as number[];
```

**✅ Good:**
```typescript
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
    console.log(data.email);
  } else {
    throw new Error('Invalid user data');
  }
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

const filtered = numbers.filter(isDefined);
```

#### R12. Avoid Barrel Exports (index.ts Re-exports)

Don't use index.ts files that re-export everything. Import directly from source files to prevent circular dependencies and improve tree-shaking.

**❌ Bad:**
```typescript
// services/index.ts
export * from './user-service';
export * from './auth-service';
export * from './payment-service';

import { UserService, AuthService } from './services';
```

**✅ Good:**
```typescript
import { UserService } from './services/user-service';
import { AuthService } from './services/auth-service';
```


#### R13. Use Discriminated Unions for Error Handling

Return discriminated unions instead of throwing errors. This makes error handling explicit and type-safe.

**❌ Bad:**
```typescript
class UserService {
  async getUser(id: string): Promise<User> {
    const user = await db.findUser(id);
    if (!user) throw new Error('User not found');
    if (!user.isActive) throw new Error('User is inactive');
    return user;
  }
}

try {
  const user = await userService.getUser('123');
  console.log(user);
} catch (error) {
  console.error(error);
}
```

**✅ Good:**
```typescript
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
        return { success: false, error: { type: 'NOT_FOUND', userId: id } };
      }
      
      if (!user.isActive) {
        return { success: false, error: { type: 'INACTIVE', userId: id } };
      }
      
      return { success: true, data: user };
    } catch (error) {
      return { success: false, error: { type: 'DB_ERROR', message: String(error) } };
    }
  }
}

const result = await userService.getUser('123');
if (result.success) {
  console.log(result.data);
} else {
  switch (result.error.type) {
    case 'NOT_FOUND':
      console.log(`User ${result.error.userId} not found`);
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
  console.log(error.message); // Unsafe property access
  if (error.isNetworkError) retryOperation();
}

try {
  await parseJSON(input);
} catch (error) {
  const e = error as Error;
  logger.error(e.message);
}
```

**✅ Good:**
```typescript
try {
  await riskyOperation();
} catch (error: unknown) {
  if (error instanceof Error) {
    console.log(error.message);
    if (error instanceof NetworkError) {
      retryOperation();
    }
  } else if (typeof error === 'string') {
    console.log(error);
  } else {
    console.log('Unknown error:', String(error));
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'Unknown error occurred';
}
```

#### R15. Use Const Assertions and Template Literal Types

Use `as const` and template literal types for compile-time validation of string patterns.

**❌ Bad:**
```typescript
const ROUTES = {
  users: '/api/users',
  posts: '/api/posts',
  comments: '/api/comments'
};

type Route = string;

function buildUrl(route: string, id?: string): string {
  return id ? `${route}/${id}` : route;
}
```

**✅ Good:**
```typescript
const ROUTES = {
  users: '/api/users',
  posts: '/api/posts',
  comments: '/api/comments'
} as const;

type Route = typeof ROUTES[keyof typeof ROUTES];

type ApiRoute = `/api/${string}`;
type RouteWithId<T extends string> = `${T}/${string}`;

function buildUrl<T extends ApiRoute>(route: T, id?: string): T | RouteWithId<T> {
  return id ? `${route}/${id}` as RouteWithId<T> : route;
}

const EVENTS = ['click', 'focus', 'blur'] as const;
type EventType = typeof EVENTS[number];
```

#### R16. Use Dependency Injection Tokens Instead of Classes

Use Symbol tokens for dependency injection instead of class constructors. This improves minification and makes contracts explicit.

**❌ Bad:**
```typescript
class Container {
  private services = new Map<any, any>();
  
  register<T>(serviceClass: new (...args: any[]) => T, instance: T): void {
    this.services.set(serviceClass, instance);
  }
  
  get<T>(serviceClass: new (...args: any[]) => T): T {
    return this.services.get(serviceClass);
  }
}

container.register(UserService, new UserService());
const userService = container.get(UserService);
```

**✅ Good:**
```typescript
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

const USER_SERVICE: ServiceToken<UserService> = DI_TOKENS.UserService;
container.register(USER_SERVICE, () => new UserService(container.get(DATABASE)));
const userService = container.get(USER_SERVICE);
```

#### R17. Validate at the Edge with Zod

Use Zod or similar runtime validation at system boundaries. Parse, don't validate.

**❌ Bad:**
```typescript
class UserController {
  async createUser(req: Request): Promise<User> {
    const { email, password, age } = req.body;
    
    if (!email || typeof email !== 'string') {
      throw new Error('Invalid email');
    }
    if (!password || password.length < 8) {
      throw new Error('Invalid password');
    }
    if (age !== undefined && typeof age !== 'number') {
      throw new Error('Invalid age');
    }
    
    return this.userService.create({ email, password, age });
  }
}
```

**✅ Good:**
```typescript
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  age: z.number().min(0).max(150).optional()
});

type CreateUserInput = z.infer<typeof CreateUserSchema>;

class UserController {
  async createUser(req: Request): Promise<User> {
    const input = CreateUserSchema.parse(req.body);
    return this.userService.create(input);
  }
}

const ConfigSchema = z.object({
  database: z.object({
    host: z.string(),
    port: z.number().int().positive(),
    username: z.string(),
    password: z.string()
  })
});

function loadConfig(configFile: string): z.infer<typeof ConfigSchema> {
  const raw = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  return ConfigSchema.parse(raw);
}
```

#### R18. Keep Parent Files Adjacent to Their Helper Directories

When a file needs multiple helper files, create a helper directory at the same level as the parent file, not containing it. The parent orchestrates its helpers.

**❌ Bad:**
```typescript
src/
  toy-handlers/
    toy-processor.ts      // Parent file wrongly placed inside
    parse-toy.ts
    validate-toy.ts
```

**✅ Good:**
```typescript
src/
  toy-processor.ts        // Parent file at root level
  toy-processor/          // Helper directory with same name prefix
    parse-toy.ts
    validate-toy.ts

src/
  user-service.ts         // Main service file
  user-service/           // Its helpers
    user-validator.ts
    user-repository.ts

import { parseToy } from './toy-processor/parse-toy';
import { ToyProcessor } from './toy-processor';
```


**Exception for CLI Commands:**
```typescript
src/commands/
  apply/                  // Command directory
    apply.ts              // Main command implementation  
    apply.command.ts      // Export file for command registry
```