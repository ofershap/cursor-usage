#!/usr/bin/env node

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const errors = [];
const warnings = [];

function error(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function parseFrontmatter(content) {
  const normalized = content.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) return null;
  const closing = normalized.indexOf("\n---\n", 4);
  if (closing === -1) return null;

  const block = normalized.slice(4, closing);
  const fields = {};
  for (const line of block.split("\n")) {
    const match = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (match) fields[match[1]] = match[2].trim();
  }
  return fields;
}

async function validatePlugin() {
  console.log("Validating cursor-usage plugin...\n");

  const pluginJson = await readJson(
    path.join(root, ".cursor-plugin", "plugin.json"),
  );
  if (!pluginJson) {
    error(".cursor-plugin/plugin.json is missing or invalid");
    return;
  }

  const namePattern = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/;
  if (!namePattern.test(pluginJson.name)) {
    error(`plugin.json name "${pluginJson.name}" doesn't match pattern`);
  }

  for (const field of ["name", "description", "version", "author", "license"]) {
    if (!pluginJson[field]) {
      error(`plugin.json missing required field: ${field}`);
    }
  }

  if (pluginJson.logo && !(await exists(path.join(root, pluginJson.logo)))) {
    warn(`Logo file not found: ${pluginJson.logo}`);
  }

  const skillsDir = path.join(root, "skills");
  if (await exists(skillsDir)) {
    const skills = await fs.readdir(skillsDir);
    for (const skill of skills) {
      const skillPath = path.join(skillsDir, skill, "SKILL.md");
      if (!(await exists(skillPath))) {
        error(`Skill ${skill} is missing SKILL.md`);
        continue;
      }
      const content = await fs.readFile(skillPath, "utf8");
      const fm = parseFrontmatter(content);
      if (!fm) {
        error(`Skill ${skill}/SKILL.md is missing frontmatter`);
      } else {
        if (!fm.name) error(`Skill ${skill}/SKILL.md missing name in frontmatter`);
        if (!fm.description)
          error(`Skill ${skill}/SKILL.md missing description in frontmatter`);
        if (fm.name && fm.name !== skill) {
          warn(
            `Skill ${skill}: frontmatter name "${fm.name}" doesn't match directory name`,
          );
        }
      }
    }
    console.log(`  Skills: ${skills.length} found`);
  }

  const rulesDir = path.join(root, "rules");
  if (await exists(rulesDir)) {
    const rules = await fs.readdir(rulesDir);
    for (const rule of rules) {
      if (!rule.endsWith(".mdc") && !rule.endsWith(".md")) continue;
      const content = await fs.readFile(path.join(rulesDir, rule), "utf8");
      const fm = parseFrontmatter(content);
      if (!fm || !fm.description) {
        error(`Rule ${rule} missing description in frontmatter`);
      }
    }
    console.log(`  Rules: ${rules.length} found`);
  }

  const commandsDir = path.join(root, "commands");
  if (await exists(commandsDir)) {
    const commands = await fs.readdir(commandsDir);
    for (const cmd of commands) {
      if (!cmd.endsWith(".md")) continue;
      const content = await fs.readFile(path.join(commandsDir, cmd), "utf8");
      const fm = parseFrontmatter(content);
      if (!fm) {
        error(`Command ${cmd} missing frontmatter`);
      } else {
        if (!fm.name) error(`Command ${cmd} missing name in frontmatter`);
        if (!fm.description)
          error(`Command ${cmd} missing description in frontmatter`);
      }
    }
    console.log(`  Commands: ${commands.length} found`);
  }

  const agentsDir = path.join(root, "agents");
  if (await exists(agentsDir)) {
    const agents = await fs.readdir(agentsDir);
    for (const agent of agents) {
      if (!agent.endsWith(".md")) continue;
      const content = await fs.readFile(path.join(agentsDir, agent), "utf8");
      const fm = parseFrontmatter(content);
      if (!fm) {
        error(`Agent ${agent} missing frontmatter`);
      } else {
        if (!fm.name) error(`Agent ${agent} missing name in frontmatter`);
        if (!fm.description)
          error(`Agent ${agent} missing description in frontmatter`);
      }
    }
    console.log(`  Agents: ${agents.length} found`);
  }

  const mcpJson = await readJson(path.join(root, "mcp.json"));
  if (!mcpJson) {
    warn("mcp.json is missing");
  } else if (!mcpJson.mcpServers) {
    error("mcp.json missing mcpServers field");
  }
  console.log(`  MCP config: ${mcpJson ? "found" : "missing"}`);

  console.log("");

  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
    console.log("");
  }

  if (errors.length > 0) {
    console.log(`Errors (${errors.length}):`);
    for (const e of errors) console.log(`  ✗ ${e}`);
    console.log("");
    process.exit(1);
  }

  console.log("✓ Plugin validation passed");
}

validatePlugin().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
