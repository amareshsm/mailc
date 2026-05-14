/**
 * `mailc init` command implementation.
 *
 * Scaffolds a new mailc project with a starter template,
 * sample data, config file, and output directory.
 *
 * Node-only: uses `node:fs` and `node:path`.
 *
 * @module cli/init-command
 */

import fs from 'node:fs';
import path from 'node:path';
import { success, error, info } from './output.js';
import { EXIT_SUCCESS, EXIT_IO_ERROR } from './exit-codes.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Options parsed from the `mailc init` CLI flags. */
export interface InitFlags {
  /** Skip interactive prompts and use defaults. */
  yes: boolean;
}

// ---------------------------------------------------------------------------
// Starter templates
// ---------------------------------------------------------------------------

const STARTER_MC = `<mc>
  <mc-head>
    <mc-preview>Welcome to mailc — the modern email compiler</mc-preview>
    <mc-attributes>
      <mc-all padding="0px" />
      <mc-text font-size="14px" line-height="1.5" color="#333333" />
    </mc-attributes>
  </mc-head>

  <mc-body>
    <mc-section background-color="#f4f4f5" padding="20px 0">
      <mc-column>
        <mc-text align="center" font-size="24px" font-weight="bold" color="#111827">
          Hello {{name}} 👋
        </mc-text>
      </mc-column>
    </mc-section>

    <mc-section padding="32px 0">
      <mc-column>
        <mc-text>
          Welcome to <strong>mailc</strong> — the modern email compiler that supports
          both .mc markup and JSON input, with built-in dynamic templating,
          CSS safety checking, and output linting.
        </mc-text>
        <mc-button href="https://github.com/amareshsm/mailc" background-color="#3b82f6" color="#ffffff" border-radius="6px">
          Get Started
        </mc-button>
      </mc-column>
    </mc-section>

    <mc-section background-color="#f4f4f5" padding="16px 0">
      <mc-column>
        <mc-text align="center" font-size="12px" color="#6b7280">
          Built with mailc — markup &amp; JSON to email-safe HTML
        </mc-text>
      </mc-column>
    </mc-section>
  </mc-body>
</mc>
`;

const STARTER_JSON = `{
  "metadata": {
    "name": "welcome",
    "description": "Starter JSON template — same email, JSON format"
  },
  "sampleData": {
    "name": "World"
  },
  "template": {
    "type": "mc",
    "children": [
      {
        "type": "mc-head",
        "children": [
          {
            "type": "mc-preview",
            "content": "Welcome to mailc — the modern email compiler"
          }
        ]
      },
      {
        "type": "mc-body",
        "children": [
          {
            "type": "mc-section",
            "attributes": { "background-color": "#f4f4f5", "padding": "20px 0" },
            "children": [
              {
                "type": "mc-column",
                "children": [
                  {
                    "type": "mc-text",
                    "attributes": { "align": "center", "font-size": "24px", "font-weight": "bold", "color": "#111827" },
                    "content": "Hello {{name}} 👋"
                  }
                ]
              }
            ]
          },
          {
            "type": "mc-section",
            "attributes": { "padding": "32px 0" },
            "children": [
              {
                "type": "mc-column",
                "children": [
                  {
                    "type": "mc-text",
                    "content": "Welcome to <strong>mailc</strong> — works from JSON too!"
                  },
                  {
                    "type": "mc-button",
                    "attributes": { "href": "https://github.com/amareshsm/mailc", "background-color": "#3b82f6", "color": "#ffffff", "border-radius": "6px" },
                    "content": "Get Started"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
`;

const STARTER_DATA = `{
  "name": "World"
}
`;

const STARTER_CONFIG = `// mailc.config.js — Email compiler configuration
// Docs: https://github.com/amareshsm/mailc

export default {
  width: 600,
  targetClients: [
    'gmail.*',
    'apple-mail.*',
    'outlook.*',
    'yahoo.*',
  ],
  responsive: {
    breakpoint: 480,
  },
  output: {
    minify: false,
  },
  templateEngine: {
    strictVariables: false,
  },
};
`;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Executes the `mailc init` command.
 *
 * Creates a project scaffold with templates, data, config, and dist directory.
 *
 * @param targetDir - The directory to scaffold in (defaults to cwd).
 * @param _flags    - Parsed CLI flags (reserved for interactive mode).
 * @returns Exit code.
 */
export function runInit(
  targetDir: string | undefined,
  _flags: InitFlags,
): number {
  const dir = path.resolve(targetDir ?? '.');

  try {
    const created: string[] = [];

    // Create directories
    for (const sub of ['templates', 'data', 'dist']) {
      const subDir = path.join(dir, sub);
      if (!fs.existsSync(subDir)) {
        fs.mkdirSync(subDir, { recursive: true });
        created.push(`${sub}/`);
      }
    }

    // Write files (skip if they already exist)
    const files: [string, string][] = [
      ['mailc.config.js', STARTER_CONFIG],
      ['templates/welcome.mc', STARTER_MC],
      ['templates/welcome.json', STARTER_JSON],
      ['data/welcome.json', STARTER_DATA],
    ];

    for (const [rel, content] of files) {
      const fullPath = path.join(dir, rel);
      if (fs.existsSync(fullPath)) {
        process.stderr.write(info(`Skipped ${rel} (already exists)`) + '\n');
      } else {
        fs.writeFileSync(fullPath, content, 'utf-8');
        created.push(rel);
      }
    }

    // Summary
    if (created.length > 0) {
      process.stderr.write('\n' + success('Project initialized!') + '\n\n');
      process.stderr.write('  Created:\n');
      for (const f of created) {
        process.stderr.write(`    ${f}\n`);
      }
      process.stderr.write('\n  Next steps:\n');
      process.stderr.write('    mailc build templates/welcome.mc -o dist/welcome.html\n');
      process.stderr.write('    mailc build templates/welcome.json -o dist/welcome-json.html\n\n');
    } else {
      process.stderr.write(info('Nothing to create — all files already exist.') + '\n');
    }

    return EXIT_SUCCESS;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(error(`Failed to initialize project: ${msg}`) + '\n');
    return EXIT_IO_ERROR;
  }
}
