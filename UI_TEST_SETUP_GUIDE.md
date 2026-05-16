# Topptic UI - Test Setup & Automation Guide

## 🧪 Testing Framework Setup

### Installation (5 minutes)

```bash
# Install testing dependencies
npm install --save-dev @testing-library/react @testing-library/jest-dom jest @types/jest

# Install E2E testing (optional but recommended)
npm install --save-dev cypress @cypress/schematic
```

### Jest Configuration

Create `jest.config.js`:
```javascript
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
}

module.exports = createJestConfig(customJestConfig)
```

### Jest Setup File

Create `jest.setup.js`:
```javascript
import '@testing-library/jest-dom'
```

### Update package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## 📝 TEST EXAMPLES

### Button Component Test

```typescript
// __tests__/components/Button.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/app/components/common/Button';

describe('Button Component', () => {
  test('renders button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  test('applies primary variant by default', () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole('button')).toHaveClass('btn-primary');
  });

  test('calls onClick handler', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('disables button when disabled prop is true', () => {
    render(<Button disabled>Click</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### NavItem Component Test

```typescript
// __tests__/components/NavItem.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { NavItem } from '@/app/components/sidebar/NavItem';

describe('NavItem Component', () => {
  const mockIcon = <span data-testid="icon">📄</span>;

  test('renders label', () => {
    render(<NavItem icon={mockIcon} label="Projects" />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  test('displays badge when provided', () => {
    render(<NavItem icon={mockIcon} label="Projects" badge="3" />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('shows active state styling', () => {
    const { container } = render(<NavItem icon={mockIcon} label="Projects" isActive />);
    const button = container.querySelector('button');
    expect(button).toHaveClass('bg-blue-500/20');
  });

  test('shows inactive state styling', () => {
    const { container } = render(<NavItem icon={mockIcon} label="Projects" isActive={false} />);
    const button = container.querySelector('button');
    expect(button).toHaveClass('text-slate-400');
  });
});
```

### Badge Component Test

```typescript
// __tests__/components/Badge.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/app/components/common/Badge';

describe('Badge Component', () => {
  test('renders with text', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  test('applies success variant', () => {
    const { container } = render(<Badge variant="success">Active</Badge>);
    expect(container.firstChild).toHaveClass('badge-success');
  });

  test('applies warning variant', () => {
    const { container } = render(<Badge variant="warning">Pending</Badge>);
    expect(container.firstChild).toHaveClass('badge-warning');
  });

  test('applies error variant', () => {
    const { container } = render(<Badge variant="error">Error</Badge>);
    expect(container.firstChild).toHaveClass('badge-error');
  });
});
```

### Sidebar Component Test

```typescript
// __tests__/components/Sidebar.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import Sidebar from '@/app/components/Sidebar';

describe('Sidebar Component', () => {
  test('renders logo', () => {
    render(<Sidebar />);
    expect(screen.getByText('Topptic')).toBeInTheDocument();
  });

  test('renders version text', () => {
    render(<Sidebar />);
    expect(screen.getByText('v0.1.0')).toBeInTheDocument();
  });

  test('renders all navigation items', () => {
    render(<Sidebar />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByText('AI Roadmap')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  test('renders status indicator', () => {
    render(<Sidebar />);
    expect(screen.getByText(/AI Engine: Ready/i)).toBeInTheDocument();
  });

  test('renders projects list', () => {
    render(<Sidebar />);
    expect(screen.getByText(/Projects/i)).toBeInTheDocument();
  });
});
```

---

## 🎬 E2E Test Examples (Cypress)

Create `cypress/e2e/ui.cy.ts`:

```typescript
describe('Topptic UI - End to End Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000')
  })

  describe('Sidebar', () => {
    it('should display sidebar with logo', () => {
      cy.get('aside').should('exist')
      cy.contains('Topptic').should('be.visible')
    })

    it('should have active Projects navigation item', () => {
      cy.contains('Projects').parent().should('have.class', 'bg-blue-500/20')
    })

    it('should expand and collapse projects list', () => {
      cy.contains('Projects').click()
      cy.contains('E-commerce App').should('be.visible')
      cy.contains('Projects').click()
    })

    it('should show AI status indicator', () => {
      cy.contains('AI Engine: Ready').should('be.visible')
    })
  })

  describe('Editor', () => {
    it('should display Monaco Editor', () => {
      cy.get('.monaco-editor').should('exist')
    })

    it('should display file tabs', () => {
      cy.contains('App.tsx').should('be.visible')
      cy.contains('utils.ts').should('be.visible')
    })

    it('should show code in editor', () => {
      cy.get('.monaco-editor').should('contain', 'import React')
    })

    it('should have dirty indicator on tabs', () => {
      cy.get('[data-testid="dirty-indicator"]').should('be.visible')
    })
  })

  describe('Chat Panel', () => {
    it('should display AI chat panel', () => {
      cy.contains('AI Assistant').should('be.visible')
    })

    it('should show welcome message', () => {
      cy.contains(/Hello.*Topptic Assistant/i).should('be.visible')
    })

    it('should send message', () => {
      cy.get('input[placeholder="Ask me anything..."]').type('How do I debug?')
      cy.contains('button', 'Send').click()
      cy.contains('How do I debug?').should('be.visible')
    })

    it('should show typing indicator', () => {
      cy.get('input[placeholder="Ask me anything..."]').type('Test{enter}')
      cy.get('[data-testid="typing-indicator"]').should('be.visible')
    })
  })

  describe('Interactions', () => {
    it('should change active navigation item', () => {
      cy.contains('Build').click()
      cy.contains('Build').should('have.class', 'bg-blue-500/20')
    })

    it('should navigate between tabs', () => {
      cy.contains('utils.ts').click()
      cy.contains('utils.ts').parent().should('have.class', 'bg-slate-800')
    })

    it('should close tab', () => {
      cy.contains('utils.ts').parent().find('button[aria-label="Close"]').click()
      cy.contains('utils.ts').should('not.exist')
    })
  })

  describe('Animations', () => {
    it('should have smooth hover effects', () => {
      cy.contains('Projects').trigger('mouseover')
      cy.contains('Projects').parent().should('have.css', 'background-color')
    })

    it('should display chat panel with animation', () => {
      cy.contains('AI Assistant').should('be.visible')
    })
  })

  describe('Accessibility', () => {
    it('should have proper focus order', () => {
      cy.get('body').tab()
      cy.focused().should('have.attr', 'type', 'button')
    })

    it('should show focus rings', () => {
      cy.get('button').first().focus()
      cy.get('button').first().should('have.css', 'outline')
    })

    it('should be keyboard navigable', () => {
      cy.get('button').first().focus()
      cy.get('button').first().type('{enter}')
    })
  })
})
```

---

## 🧪 Visual Regression Testing

### Setup with Percy or Chromatic

```bash
# Install Percy for visual regression testing
npm install --save-dev @percy/cli @percy/cypress
```

Create `cypress/support/percy.ts`:

```typescript
import '@percy/cypress'

describe('Visual Regression Tests', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000')
  })

  it('should match sidebar snapshot', () => {
    cy.get('aside').should('be.visible')
    cy.percySnapshot('Sidebar')
  })

  it('should match editor snapshot', () => {
    cy.get('.monaco-editor').should('exist')
    cy.percySnapshot('Editor Panel')
  })

  it('should match chat panel snapshot', () => {
    cy.contains('AI Assistant').should('be.visible')
    cy.percySnapshot('Chat Panel')
  })

  it('should match full page snapshot', () => {
    cy.percySnapshot('Full Page')
  })
})
```

---

## 📊 Test Coverage Goals

### Target Coverage
- Statements: **80%+**
- Branches: **75%+**
- Functions: **80%+**
- Lines: **80%+**

### Run Coverage Report
```bash
npm run test:coverage
```

---

## 🚀 CI/CD Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: UI Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      
      - run: npm run test -- --coverage
      
      - run: npm run build
      
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: test-coverage
          path: coverage/
```

---

## 📋 QUICK TEST COMMANDS

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Run only Button component tests
npm test -- Button

# Run E2E tests (Cypress)
npx cypress open

# Run E2E tests headless
npx cypress run

# Visual regression testing
npx percy exec -- npx cypress run
```

---

## ✅ TESTING CHECKLIST

### Unit Tests
- [ ] Button component tests pass
- [ ] Badge component tests pass
- [ ] NavItem component tests pass
- [ ] Sidebar component tests pass
- [ ] EditorPanel tests pass
- [ ] ChatPanel tests pass
- [ ] Coverage > 80%

### E2E Tests
- [ ] Sidebar interactions work
- [ ] Editor tabs work
- [ ] Chat functionality works
- [ ] Navigation works
- [ ] Animations work
- [ ] Accessibility features work

### Manual Tests (from UI_TESTING_VERIFICATION.md)
- [ ] Visual verification complete
- [ ] Color verification complete
- [ ] Interaction testing complete
- [ ] Animation testing complete
- [ ] Responsive testing complete
- [ ] Accessibility testing complete
- [ ] Performance acceptable

### CI/CD
- [ ] Tests run on push
- [ ] Tests run on PR
- [ ] Build succeeds
- [ ] Coverage reported
- [ ] All checks pass

---

## 🐛 Debugging Tests

### View DOM in Tests
```typescript
import { screen, debug } from '@testing-library/react'

test('debug example', () => {
  render(<Component />)
  debug() // Prints entire DOM
  debug(screen.getByRole('button')) // Prints specific element
})
```

### Check Accessibility
```typescript
import { axe, toHaveNoViolations } from 'jest-axe'

test('should not have accessibility violations', async () => {
  const { container } = render(<Component />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

### Test Async Operations
```typescript
import { waitFor } from '@testing-library/react'

test('async test', async () => {
  render(<Component />)
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  })
})
```

---

## 📚 TESTING BEST PRACTICES

### Do's ✅
- Test user interactions, not implementation
- Use semantic queries (`getByRole`, `getByLabelText`)
- Write tests before fixing bugs
- Keep tests focused and simple
- Mock external dependencies

### Don'ts ❌
- Don't test CSS (use visual regression)
- Don't use `querySelector` (use semantic queries)
- Don't test internals (test behavior)
- Don't create massive test files
- Don't mock everything

---

## 🎯 NEXT STEPS

1. **Setup Testing** - Follow installation steps above
2. **Write Tests** - Use examples provided
3. **Run Tests** - Execute `npm test`
4. **Check Coverage** - Run `npm run test:coverage`
5. **Integrate CI/CD** - Add GitHub Actions workflow
6. **Maintain Tests** - Update as components change

---

## 📞 TEST RESOURCES

- [Testing Library Docs](https://testing-library.com/)
- [Jest Documentation](https://jestjs.io/)
- [Cypress Documentation](https://docs.cypress.io/)
- [React Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

*This guide provides a complete testing strategy for the Topptic UI. Use it to ensure code quality and catch regressions.*
