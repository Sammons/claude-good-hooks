# Claude Good Hooks - Package Architecture

## Overview

This monorepo follows a layered architecture with clear separation of concerns. Each package has a specific responsibility and well-defined boundaries to prevent circular dependencies and ensure maintainability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                           Consumer Layer                        │
├─────────────────────────────────────────────────────────────────┤
│  @sammons/claude-good-hooks (CLI)                              │
│  • Command-line interface                                       │
│  • User interaction                                             │
│  • Plugin management                                            │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Implementation Layer                      │
├─────────────────────────────────────────────────────────────────┤
│  Hook Implementations (Examples & Templates)                    │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │ @sammons/       │ │ @sammons/       │ │ More hook       │   │
│  │ dirty-good-     │ │ template-hook   │ │ packages...     │   │
│  │ claude-hook     │ │                 │ │                 │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────┬───────────────────────────────────────────────────┘
              │
              ▼
              │
              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Foundation Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  @sammons/claude-good-hooks-types                              │
│  • Pure TypeScript types                                        │
│  • Interface definitions                                        │
│  • Type guards and validators                                   │
│  • No runtime dependencies                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Package Responsibilities

### 1. Foundation Layer

#### @sammons/claude-good-hooks-types
- **Purpose**: Pure type definitions and validation utilities
- **Responsibilities**:
  - Define all TypeScript interfaces and types
  - Provide runtime type guards for validation
  - Maintain type safety across the ecosystem
- **Dependencies**: None (foundation layer)
- **Architectural Rules**:
  - Must not import from other packages in the monorepo
  - Should be pure TypeScript with minimal runtime footprint
  - Can only depend on Node.js built-ins or TypeScript

### 2. Implementation Layer

#### Hook Implementation Packages
Examples: `@sammons/git-dirty-hook`, `@sammons/code-outline-hook`

- **Purpose**: Concrete hook implementations
- **Responsibilities**:
  - Implement specific hook functionality
  - Provide complete, ready-to-use hooks
  - Serve as examples for custom hook development
  - Can export multiple hook variants via deep imports
- **Dependencies**: 
  - `@sammons/claude-good-hooks-types` (foundation)
- **Architectural Rules**:
  - Can depend on foundation layer
  - Should be self-contained and focused on single responsibility
  - Can have external runtime dependencies specific to their function
  - Can export multiple hook configurations through named exports

### 3. Consumer Layer

#### @sammons/claude-good-hooks (CLI)
- **Purpose**: Command-line interface for managing hooks
- **Responsibilities**:
  - Provide user-facing CLI commands
  - Handle hook installation and configuration
  - Manage Claude settings integration
  - User interaction and feedback
- **Dependencies**: 
  - `@sammons/claude-good-hooks-types` (foundation)
  - External dependencies: `chalk`, `commander`, etc.
- **Architectural Rules**:
  - Can depend on foundation layer directly
  - Should handle all user interaction
  - Contains business logic for hook management

## Dependency Rules

### Allowed Dependencies

1. **Foundation → Nothing** (pure types)
2. **Implementation → Foundation** (hooks use types)  
3. **Consumer → Foundation** (CLI uses types directly)

### Prohibited Dependencies

- **No circular dependencies** between any packages
- **No upward dependencies** (lower layers cannot depend on higher layers)
- **No cross-layer dependencies** (Implementation cannot depend on Consumer)

## Peer Dependencies

Each package declares appropriate peer dependencies to ensure compatibility:

- **TypeScript**: All packages that export types declare TypeScript as optional peer dependency
- **Foundation types**: All packages consuming types declare the types package as peer dependency

## Benefits of This Architecture

1. **Clear Separation of Concerns**: Each layer has a specific, well-defined purpose
2. **No Circular Dependencies**: Strict layering prevents dependency cycles
3. **Maintainability**: Changes in one layer have predictable effects on dependent layers
4. **Extensibility**: New hooks can be added without affecting existing packages
5. **Type Safety**: Foundation types ensure consistency across all packages

## Development Guidelines

### Adding New Packages

1. **Determine the appropriate layer** based on the package's primary responsibility
2. **Follow the dependency rules** - only depend on lower layers
3. **Declare proper peer dependencies** for packages you depend on
4. **Update this documentation** to reflect the new package

### Modifying Existing Packages

1. **Check dependency impact** when adding new dependencies
2. **Run dependency validation** to ensure no circular dependencies are introduced
3. **Update peer dependencies** if you add new imports from other monorepo packages
4. **Maintain architectural boundaries** - don't bypass the layered structure

### Testing Dependencies

The CI pipeline includes automated checks to validate:
- No circular dependencies exist
- All packages build successfully
- Peer dependencies are correctly declared
- Type compatibility across packages

## Hook Resolution and Deep Imports

### Hook Package Naming and Resolution

The CLI supports flexible hook resolution through module paths:

1. **Default Export**: `@org/package-name` resolves to the default export or `HookPlugin` named export
2. **Deep Import**: `@org/package-name/variant` resolves to a specific named export

### Implementation Pattern

Hook packages can export multiple configurations:

```typescript
// Default export - main hook
export default mainHook;
export const HookPlugin = mainHook;

// Named exports for deep imports
export const minimal = { ...mainHook, /* custom config */ };
export const detailed = { ...mainHook, /* custom config */ };
```

### Usage Examples

```bash
# Apply default hook
claude-good-hooks apply --project @sammons/code-outline-hook

# Apply specific variant via deep import
claude-good-hooks apply --project @sammons/code-outline-hook/minimal
claude-good-hooks apply --project @sammons/code-outline-hook/detailed
```

This pattern allows:
- Single package to provide multiple pre-configured hooks
- Users to choose appropriate configuration without custom arguments
- Backward compatibility with existing single-export packages