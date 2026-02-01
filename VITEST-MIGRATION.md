# Migrating Angular 21 Apps from Karma to Vitest

This guide covers migrating Angular 21 applications from Karma to Vitest, with separate paths for zone-enabled and zoneless apps.

- [Migrating Angular 21 Apps from Karma to Vitest](#migrating-angular-21-apps-from-karma-to-vitest)
  - [Prerequisites](#prerequisites)
  - [Step 1: Install Required Packages](#step-1-install-required-packages)
    - [Remove Karma packages](#remove-karma-packages)
    - [Install Vitest and testing libraries](#install-vitest-and-testing-libraries)
  - [Step 2: Update Configuration Files](#step-2-update-configuration-files)
    - [2.1 Update `angular.json`](#21-update-angularjson)
    - [2.2 Update `tsconfig.spec.json`](#22-update-tsconfigspecjson)
    - [2.3 Create `vitest.config.ts` (Optional but Recommended)](#23-create-vitestconfigts-optional-but-recommended)
    - [2.4 Create `setup-test.ts`](#24-create-setup-testts)
      - [For Zone-Enabled Apps](#for-zone-enabled-apps)
      - [For Zoneless Apps](#for-zoneless-apps)
    - [2.5 Update `package.json`](#25-update-packagejson)
  - [Step 3: Refactor Test Files](#step-3-refactor-test-files)
    - [3.1 Remove Vitest Imports (Optional)](#31-remove-vitest-imports-optional)
    - [3.2 Refactor Component Tests to Use Angular Testing Library](#32-refactor-component-tests-to-use-angular-testing-library)
      - [Simple Component Test](#simple-component-test)
      - [Component with Dependencies](#component-with-dependencies)
      - [Component with Animations](#component-with-animations)
    - [3.3 Service Tests](#33-service-tests)
    - [3.4 Using Vitest Mocks](#34-using-vitest-mocks)
  - [Step 4: Running Tests](#step-4-running-tests)
    - [Run all tests](#run-all-tests)
    - [Run tests once (no watch)](#run-tests-once-no-watch)
    - [Run tests for a specific project](#run-tests-for-a-specific-project)
    - [Run with coverage](#run-with-coverage)
    - [Run with UI (Vitest UI)](#run-with-ui-vitest-ui)
  - [Step 5: Debugging Tests in VSCode](#step-5-debugging-tests-in-vscode)
    - [5.1 Important: Vitest Extension Compatibility](#51-important-vitest-extension-compatibility)
    - [5.2 Configure VSCode for Debugging](#52-configure-vscode-for-debugging)
    - [5.3 Debug a Single Test](#53-debug-a-single-test)
      - [Option 1: Using `it.only()` or `describe.only()` (Recommended)](#option-1-using-itonly-or-describeonly-recommended)
      - [Option 2: Using the `--testNamePattern` flag](#option-2-using-the---testnamepattern-flag)
    - [5.4 Setting Breakpoints](#54-setting-breakpoints)
    - [5.5 Debugging Tips](#55-debugging-tips)
  - [Common Issues and Solutions](#common-issues-and-solutions)
    - [Issue: "Component is not resolved" error](#issue-component-is-not-resolved-error)
    - [Issue: "No provider found" errors](#issue-no-provider-found-errors)
    - [Issue: `toBeInTheDocument()` not available](#issue-tobeinthedocument-not-available)
    - [Issue: HTTP errors in tests](#issue-http-errors-in-tests)
    - [Issue: Animation-related errors](#issue-animation-related-errors)
  - [Migration Checklist](#migration-checklist)
  - [References](#references)

## Prerequisites

- Angular 21.x
- pnpm (or npm/yarn)

## Step 1: Install Required Packages

### Remove Karma packages

```sh
pnpm remove karma karma-chrome-launcher karma-coverage karma-jasmine karma-jasmine-html-reporter
```

### Install Vitest and testing libraries

```sh
pnpm install vitest jsdom --save-dev
pnpm install @testing-library/angular @testing-library/jest-dom --save-dev
```

## Step 2: Update Configuration Files

### 2.1 Update `angular.json`

Update the test configuration for each project. Replace the Karma builder with the unit-test builder:

**Before:**

```json
"test": {
  "builder": "@angular/build:karma",
  "options": {
    "tsConfig": "tsconfig.spec.json",
    "polyfills": ["zone.js", "zone.js/testing"]
  }
}
```

**After:**

```json
"test": {
  "builder": "@angular/build:unit-test",
  "options": {
    "tsConfig": "tsconfig.spec.json",
    "runner": "vitest"
  }
}
```

> **Note**: Remove the `polyfills` array - Vitest doesn't need it configured here.

### 2.2 Update `tsconfig.spec.json`

Replace Jasmine types with Vitest globals:

**Before:**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["jasmine"]
  },
  "include": ["src/**/*.ts"]
}
```

**After:**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": [
      "vitest/globals",
      "@testing-library/jest-dom"
    ]
  },
  "include": ["src/**/*.ts"]
}
```

### 2.3 Create `vitest.config.ts` (Optional but Recommended)

This file provides IDE support and can be used for direct Vitest runs. Create it in your project root:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./setup-test.ts'],
    include: [
      'src/**/*.spec.ts',
      'projects/**/*.spec.ts',
    ],
    exclude: ['node_modules/**'],
  },
  resolve: {
    alias: {
      // Add path aliases for your libraries
      '@myorg/my-lib': resolve(
        __dirname,
        'projects/myorg/my-lib/src/public-api.ts'
      ),
    },
  },
});
```

### 2.4 Create `setup-test.ts`

Create this file in your project root:

#### For Zone-Enabled Apps

```ts
import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import '@testing-library/jest-dom/vitest';

// Initialize the Angular testing environment
getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting()
);
```

#### For Zoneless Apps

```ts
import { getTestBed } from '@angular/core/testing';
import {
  BrowserTestingModule,
  platformBrowserTesting,
} from '@angular/platform-browser/testing';
import '@testing-library/jest-dom/vitest';

// Initialize the Angular testing environment
getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting()
);
```

> **Note**: The main difference is that zoneless apps don't import `zone.js`.

### 2.5 Update `package.json`

Update the test script:

```json
{
  "scripts": {
    "test": "ng test"
  }
}
```

Remove Jasmine-related dev dependencies:

```json
{
  "devDependencies": {
    // Remove these:
    // "@types/jasmine": "...",
    // "jasmine-core": "..."
  }
}
```

## Step 3: Refactor Test Files

### 3.1 Remove Vitest Imports (Optional)

With `globals: true` in your vitest config, you don't need to import test functions:

**Before:**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
```

**After:**

```ts
// No imports needed - describe, it, expect, beforeEach are global
```

### 3.2 Refactor Component Tests to Use Angular Testing Library

Angular Testing Library provides a simpler API with the `render()` function.

#### Simple Component Test

**Before (TestBed):**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

**After (Angular Testing Library):**

```ts
import { render } from '@testing-library/angular';
import { MyComponent } from './my.component';

describe('MyComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(MyComponent);
    expect(fixture.componentInstance).toBeTruthy();
  });
});
```

#### Component with Dependencies

**Before:**

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MyComponent } from './my.component';
import { MY_SERVICE_TOKEN, MyServiceImpl } from './my.service';

describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MY_SERVICE_TOKEN, useClass: MyServiceImpl },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

**After:**

```ts
import { render } from '@testing-library/angular';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MyComponent } from './my.component';
import { MY_SERVICE_TOKEN, MyServiceImpl } from './my.service';

describe('MyComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(MyComponent, {
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MY_SERVICE_TOKEN, useClass: MyServiceImpl },
      ],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
```

#### Component with Animations

```ts
import { render } from '@testing-library/angular';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MyAnimatedComponent } from './my-animated.component';

describe('MyAnimatedComponent', () => {
  it('should create', async () => {
    const { fixture } = await render(MyAnimatedComponent, {
      providers: [provideNoopAnimations()],
    });
    expect(fixture.componentInstance).toBeTruthy();
  });
});
```

### 3.3 Service Tests

Service tests can remain mostly unchanged, using TestBed:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MyService } from './my.service';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(MyService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
```

### 3.4 Using Vitest Mocks

Replace Jasmine spies with Vitest mocks:

**Before (Jasmine):**

```ts
const spy = jasmine.createSpy('mySpy');
spy.and.returnValue('value');
```

**After (Vitest):**

```ts
import { vi } from 'vitest';

const spy = vi.fn();
spy.mockReturnValue('value');

// Or in a class mock:
class MockService {
  myMethod = vi.fn().mockReturnValue('value');
}
```

## Step 4: Running Tests

### Run all tests

```sh
pnpm test
```

### Run tests once (no watch)

```sh
ng test --watch=false
```

### Run tests for a specific project

```sh
ng test my-project-name --watch=false
```

### Run with coverage

```sh
ng test --coverage
```

### Run with UI (Vitest UI)

```sh
ng test --ui
```

## Step 5: Debugging Tests in VSCode

### 5.1 Important: Vitest Extension Compatibility

> **Note**: The Vitest VSCode extension (`vitest.explorer`) runs `vitest` directly, which does **not** work with Angular projects. Angular requires `ng test` to compile templates before running tests. Running vitest directly causes "Component is not resolved" errors.

**Recommended**: Disable the Vitest extension for Angular workspaces by adding to `.vscode/settings.json`:

```json
{
  "vitest.enable": false
}
```

Instead, use the debugging approaches described below.

### 5.2 Configure VSCode for Debugging

Create or update `.vscode/launch.json` with configurations for debugging Angular tests:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Angular Tests",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": ["ng", "test", "--watch=false", "--inspect-brk"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Debug Angular Tests (specific file)",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npx",
      "runtimeArgs": [
        "ng", "test", "--watch=false", "--inspect-brk",
        "--", "--testPathPattern=${relativeFileDirname}"
      ],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### 5.3 Debug a Single Test

There are several ways to debug a specific test:

#### Option 1: Using `it.only()` or `describe.only()` (Recommended)

Temporarily modify your test to focus on a single test:

```ts
// Run only this test
it.only('should create', async () => {
  const { fixture } = await render(MyComponent);
  expect(fixture.componentInstance).toBeTruthy();
});

// Or focus on an entire describe block
describe.only('MyComponent', () => {
  // Only tests in this block will run
});
```

Then run the debugger using "Debug Angular Tests" configuration from the Run and Debug panel (`Ctrl+Shift+D`).

> **Important**: Remember to remove `.only()` before committing!

#### Option 2: Using the `--testNamePattern` flag

Run a specific test by name pattern:

```sh
ng test --watch=false -- --testNamePattern="should create"
```

### 5.4 Setting Breakpoints

1. Click in the gutter (left margin) of the line where you want to pause
2. A red dot appears indicating the breakpoint
3. Start debugging using one of the methods above
4. Execution will pause at the breakpoint

You can set breakpoints in:

- Test files (`*.spec.ts`)
- Component files (`*.component.ts`)
- Service files (`*.service.ts`)
- Any TypeScript file that runs during the test

### 5.5 Debugging Tips

- **Use `console.log()`**: Sometimes a quick `console.log()` is faster than setting up a full debug session
- **Inspect variables**: When paused at a breakpoint, hover over variables to see their values
- **Use the Debug Console**: Execute expressions while paused to inspect state
- **Step through code**: Use F10 (Step Over), F11 (Step Into), and Shift+F11 (Step Out) to navigate
- **Watch expressions**: Add expressions to the Watch panel to monitor values as you step through

## Common Issues and Solutions

### Issue: "Component is not resolved" error

**Cause**: Running `vitest` directly instead of through `ng test`.

**Solution**: Always use `ng test` which properly compiles Angular templates.

### Issue: "No provider found" errors

**Cause**: Component has dependencies that aren't provided in the test.

**Solution**: Add the required providers to the render options:

```ts
const { fixture } = await render(MyComponent, {
  providers: [
    { provide: MY_TOKEN, useClass: MockService },
  ],
});
```

### Issue: `toBeInTheDocument()` not available

**Cause**: jest-dom matchers aren't loaded when using Angular's test builder.

**Solution**: Use standard Vitest assertions instead:

```ts
// Instead of:
expect(element).toBeInTheDocument();

// Use:
expect(element).toBeTruthy();
```

### Issue: HTTP errors in tests

**Cause**: Services making HTTP calls without mock providers.

**Solution**: Provide HTTP testing modules:

```ts
providers: [
  provideHttpClient(),
  provideHttpClientTesting(),
]
```

### Issue: Animation-related errors

**Cause**: Components with animations need animation providers.

**Solution**: Use `provideNoopAnimations()`:

```ts
import { provideNoopAnimations } from '@angular/platform-browser/animations';

providers: [provideNoopAnimations()]
```

## Migration Checklist

- [ ] Remove Karma packages
- [ ] Install Vitest and testing libraries
- [ ] Update `angular.json` test configurations
- [ ] Update `tsconfig.spec.json` types
- [ ] Create `vitest.config.ts` (optional)
- [ ] Create `setup-test.ts`
- [ ] Update `package.json` scripts
- [ ] Remove Jasmine dependencies
- [ ] Refactor component tests to use `render()`
- [ ] Update service tests if needed
- [ ] Replace Jasmine spies with Vitest mocks
- [ ] Run tests and fix any issues
- [ ] Delete `karma.conf.js` if present

## References

- [Angular Testing Guide - Migrating to Vitest](https://angular.dev/guide/testing/migrating-to-vitest)
- [Angular Testing Library](https://testing-library.com/docs/angular-testing-library/intro/)
- [Vitest Documentation](https://vitest.dev/)
