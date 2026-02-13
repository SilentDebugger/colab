import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import yaml from 'js-yaml';
import { execSync } from 'child_process';
import type { Project, ConfigType, ProjectScript } from '@devdock/shared';
import type { StorageService } from './storage.js';

const CONFIG_FILES: ConfigType[] = ['package.json', 'docker-compose.yml', 'Makefile', '.devdock.yml'];
const DOCKER_COMPOSE_ALTS = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', '__pycache__', 'vendor', '.cache', 'coverage']);

export class DiscoveryService {
  private projects: Map<string, Project> = new Map();
  private storage: StorageService;

  constructor(storage: StorageService) {
    this.storage = storage;
  }

  getProjects(): Project[] {
    return Array.from(this.projects.values());
  }

  getProject(id: string): Project | undefined {
    return this.projects.get(id);
  }

  async scan(directories: string[], depth: number): Promise<Project[]> {
    this.projects.clear();
    const allNotes = this.storage.getAllNotes();

    for (const dir of directories) {
      if (!fs.existsSync(dir)) continue;
      await this.walkDirectory(dir, depth, 0);
    }

    // Merge stored data (notes, health endpoints, groups)
    for (const [id, project] of this.projects) {
      const stored = this.storage.getProjectData(id);
      if (stored.healthEndpoint) project.healthEndpoint = stored.healthEndpoint;
      if (stored.group) project.group = stored.group;
      project.notes = allNotes[id] || '';
    }

    return this.getProjects();
  }

  private async walkDirectory(dir: string, maxDepth: number, currentDepth: number): Promise<void> {
    if (currentDepth > maxDepth) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      // Check for config files at this level
      const configFound = this.detectProject(dir, entries.map(e => e.name));
      if (configFound) return; // Don't scan subdirectories of a discovered project

      // Recurse into subdirectories
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (IGNORE_DIRS.has(entry.name)) continue;
        if (entry.name.startsWith('.') && entry.name !== '.devdock.yml') continue;
        await this.walkDirectory(path.join(dir, entry.name), maxDepth, currentDepth + 1);
      }
    } catch {
      // Permission denied or other read errors — skip silently
    }
  }

  private detectProject(dir: string, fileNames: string[]): boolean {
    // Priority: .devdock.yml > package.json > docker-compose > Makefile
    if (fileNames.includes('.devdock.yml')) {
      return this.parseDevdockYml(dir);
    }
    if (fileNames.includes('package.json')) {
      return this.parsePackageJson(dir);
    }
    for (const name of DOCKER_COMPOSE_ALTS) {
      if (fileNames.includes(name)) {
        return this.parseDockerCompose(dir, name);
      }
    }
    if (fileNames.includes('Makefile')) {
      return this.parseMakefile(dir);
    }
    return false;
  }

  private parsePackageJson(dir: string): boolean {
    try {
      const raw = fs.readFileSync(path.join(dir, 'package.json'), 'utf-8');
      const pkg = JSON.parse(raw);
      if (!pkg.scripts || Object.keys(pkg.scripts).length === 0) return false;

      const scripts: ProjectScript[] = Object.entries(pkg.scripts as Record<string, string>).map(
        ([name, command]) => ({ name, command: command as string })
      );

      const project = this.createProject(
        pkg.name || path.basename(dir),
        dir,
        'package.json',
        scripts
      );
      this.projects.set(project.id, project);
      return true;
    } catch {
      return false;
    }
  }

  private parseDockerCompose(dir: string, fileName: string): boolean {
    try {
      const raw = fs.readFileSync(path.join(dir, fileName), 'utf-8');
      const compose = yaml.load(raw) as Record<string, unknown>;
      const services = compose?.services as Record<string, unknown> | undefined;
      if (!services) return false;

      const scripts: ProjectScript[] = [
        { name: 'up', command: `docker-compose -f ${fileName} up` },
        { name: 'down', command: `docker-compose -f ${fileName} down` },
        ...Object.keys(services).map(svc => ({
          name: `up:${svc}`,
          command: `docker-compose -f ${fileName} up ${svc}`,
        })),
      ];

      const project = this.createProject(
        path.basename(dir),
        dir,
        'docker-compose.yml',
        scripts
      );
      this.projects.set(project.id, project);
      return true;
    } catch {
      return false;
    }
  }

  private parseMakefile(dir: string): boolean {
    try {
      const raw = fs.readFileSync(path.join(dir, 'Makefile'), 'utf-8');
      const targets: ProjectScript[] = [];

      for (const line of raw.split('\n')) {
        const match = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):/);
        if (match && !match[1].startsWith('.')) {
          targets.push({ name: match[1], command: `make ${match[1]}` });
        }
      }

      if (targets.length === 0) return false;

      const project = this.createProject(
        path.basename(dir),
        dir,
        'Makefile',
        targets
      );
      this.projects.set(project.id, project);
      return true;
    } catch {
      return false;
    }
  }

  private parseDevdockYml(dir: string): boolean {
    try {
      const raw = fs.readFileSync(path.join(dir, '.devdock.yml'), 'utf-8');
      const config = yaml.load(raw) as {
        name?: string;
        scripts?: Record<string, string>;
        health?: string;
        group?: string;
      };

      if (!config?.scripts) return false;

      const scripts: ProjectScript[] = Object.entries(config.scripts).map(
        ([name, command]) => ({ name, command })
      );

      const project = this.createProject(
        config.name || path.basename(dir),
        dir,
        '.devdock.yml',
        scripts
      );

      if (config.health) project.healthEndpoint = config.health;
      if (config.group) project.group = config.group;

      this.projects.set(project.id, project);
      return true;
    } catch {
      return false;
    }
  }

  private createProject(
    name: string,
    dir: string,
    configType: ConfigType,
    scripts: ProjectScript[]
  ): Project {
    const id = createHash('sha256').update(dir).digest('hex').substring(0, 12);
    const gitRemote = this.detectGitRemote(dir);

    return {
      id,
      name,
      path: dir,
      configType,
      scripts,
      status: 'stopped',
      ports: [],
      healthStatus: 'unknown',
      notes: '',
      gitRemote,
    };
  }

  private detectGitRemote(dir: string): string | undefined {
    try {
      const gitConfigPath = path.join(dir, '.git', 'config');
      if (!fs.existsSync(gitConfigPath)) return undefined;
      const result = execSync('git remote get-url origin', {
        cwd: dir,
        encoding: 'utf-8',
        timeout: 3000,
      }).trim();

      // Convert SSH URLs to HTTPS
      if (result.startsWith('git@')) {
        return result
          .replace('git@', 'https://')
          .replace(':', '/')
          .replace('.git', '');
      }
      return result.replace('.git', '');
    } catch {
      return undefined;
    }
  }
}
