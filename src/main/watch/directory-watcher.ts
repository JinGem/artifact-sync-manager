import { readdir } from "node:fs/promises";
import { watch, type FSWatcher } from "node:fs";
import { normalize } from "node:path";

export interface RemoteChangeEvent {
  type: "version-added" | "version-deleted";
  version: string;
  remoteDirectory: string;
  projectIds: string[];
  projectNames: string[];
}

interface WatcherEntry {
  projectIds: Set<string>;
  projectNames: Map<string, string>;
  watcher: FSWatcher | null;
  timer: ReturnType<typeof setInterval> | null;
  snapshot: Set<string>;
  initialized: boolean;
}

const POLL_INTERVAL = 30_000;
const VERSION_PATTERN = /^v\d+\.\d+\.\d+$/;

class WatcherService {
  private entries = new Map<string, WatcherEntry>();
  private isRunning = false;
  private onChange: ((events: RemoteChangeEvent[]) => void) | null = null;

  setOnChange(callback: (events: RemoteChangeEvent[]) => void): void {
    this.onChange = callback;
  }

  addPath(remoteDirectory: string, projectId: string, projectName: string): void {
    const dir = normalize(remoteDirectory);

    if (this.entries.has(dir)) {
      const entry = this.entries.get(dir)!;
      entry.projectIds.add(projectId);
      entry.projectNames.set(projectId, projectName);
      return;
    }

    const entry: WatcherEntry = {
      projectIds: new Set([projectId]),
      projectNames: new Map([[projectId, projectName]]),
      watcher: null,
      timer: null,
      snapshot: new Set(),
      initialized: false,
    };

    this.entries.set(dir, entry);

    if (this.isRunning) {
      this.startWatching(dir, entry);
    }
  }

  removePath(remoteDirectory: string, projectId: string): void {
    const dir = normalize(remoteDirectory);
    const entry = this.entries.get(dir);
    if (!entry) return;

    entry.projectIds.delete(projectId);
    entry.projectNames.delete(projectId);

    if (entry.projectIds.size === 0) {
      this.stopWatching(dir, entry);
      this.entries.delete(dir);
    }
  }

  removeProject(projectId: string): void {
    for (const [dir, entry] of this.entries) {
      entry.projectIds.delete(projectId);
      entry.projectNames.delete(projectId);

      if (entry.projectIds.size === 0) {
        this.stopWatching(dir, entry);
        this.entries.delete(dir);
      }
    }
  }

  /** Refresh watchers from a list of projects. Removes stale references. */
  syncFromProjects(projects: Array<{ id: string; name: string; remoteDirectory: string }>): void {
    const activeProjectIds = new Set(projects.map((p) => p.id));

    // Remove stale project references
    for (const [dir, entry] of this.entries) {
      for (const pid of entry.projectIds) {
        if (!activeProjectIds.has(pid)) {
          entry.projectIds.delete(pid);
          entry.projectNames.delete(pid);
        }
      }
      if (entry.projectIds.size === 0) {
        this.stopWatching(dir, entry);
        this.entries.delete(dir);
      }
    }

    // Add new project references
    for (const project of projects) {
      const dir = normalize(project.remoteDirectory);
      if (this.entries.has(dir)) {
        const entry = this.entries.get(dir)!;
        if (!entry.projectIds.has(project.id)) {
          entry.projectIds.add(project.id);
          entry.projectNames.set(project.id, project.name);
        }
      } else {
        const entry: WatcherEntry = {
          projectIds: new Set([project.id]),
          projectNames: new Map([[project.id, project.name]]),
          watcher: null,
          timer: null,
          snapshot: new Set(),
          initialized: false,
        };
        this.entries.set(dir, entry);
        if (this.isRunning) {
          this.startWatching(dir, entry);
        }
      }
    }
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    for (const [dir, entry] of this.entries) {
      this.startWatching(dir, entry);
    }
  }

  stop(): void {
    this.isRunning = false;
    for (const [dir, entry] of this.entries) {
      this.stopWatching(dir, entry);
    }
  }

  dispose(): void {
    this.stop();
    this.entries.clear();
    this.onChange = null;
  }

  private startWatching(dir: string, entry: WatcherEntry): void {
    this.tryWatch(dir, entry);
    this.startPolling(dir, entry);
  }

  private stopWatching(_dir: string, entry: WatcherEntry): void {
    if (entry.watcher) {
      entry.watcher.close();
      entry.watcher = null;
    }
    if (entry.timer) {
      clearInterval(entry.timer);
      entry.timer = null;
    }
  }

  private tryWatch(dir: string, entry: WatcherEntry): void {
    try {
      const watcher = watch(dir, { recursive: false }, () => {
        this.poll(dir, entry);
      });
      watcher.on("error", () => {
        // System sleep/wake may invalidate the underlying handle (ECONNRESET).
        // Close the broken watcher and reinitialize — polling fallback will
        // continue serving until the reconnect succeeds.
        try {
          watcher.close();
        } catch {
          // ignore close errors on already-broken handle
        }
        entry.watcher = null;
        entry.initialized = false;
        this.tryWatch(dir, entry);
      });
      entry.watcher = watcher;
    } catch {
      // Network shares may not support fs.watch; polling is the fallback
    }
  }

  private startPolling(dir: string, entry: WatcherEntry): void {
    this.poll(dir, entry);
    entry.timer = setInterval(() => {
      this.poll(dir, entry);
    }, POLL_INTERVAL);
  }

  private async poll(dir: string, entry: WatcherEntry): Promise<void> {
    try {
      const dirEntries = await readdir(dir, { withFileTypes: true });
      const versionDirs = new Set(
        dirEntries
          .filter((e) => e.isDirectory() && VERSION_PATTERN.test(e.name))
          .map((e) => e.name),
      );

      const added = [...versionDirs].filter((v) => !entry.snapshot.has(v));
      const removed = [...entry.snapshot].filter((v) => !versionDirs.has(v));

      entry.snapshot = versionDirs;

      // First poll: populate baseline without firing events
      if (!entry.initialized) {
        entry.initialized = true;
        return;
      }

      if ((added.length > 0 || removed.length > 0) && this.onChange) {
        const events: RemoteChangeEvent[] = [];
        const projectIds = [...entry.projectIds];
        const projectNames = [...entry.projectNames.values()];

        for (const version of added) {
          events.push({
            type: "version-added",
            version,
            remoteDirectory: dir,
            projectIds,
            projectNames,
          });
        }

        for (const version of removed) {
          events.push({
            type: "version-deleted",
            version,
            remoteDirectory: dir,
            projectIds,
            projectNames,
          });
        }

        this.onChange(events);
      }
    } catch {
      // Directory may be temporarily inaccessible; skip this poll cycle
    }
  }
}

export const watcherService = new WatcherService();
