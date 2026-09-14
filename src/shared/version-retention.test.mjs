import assert from "node:assert/strict";
import test from "node:test";

import {
  compareVersionNames,
  getVersionTimestamp,
  isVersionExpired,
  isVersionRecent,
  summarizeVersions,
} from "./version-retention.ts";

const now = Date.parse("2026-09-14T12:00:00.000Z");

test("version retention prefers uploadedAt over directory timestamps", () => {
  const version = {
    name: "v1.0.0",
    createdAt: "2026-09-14T00:00:00.000Z",
    uploadedAt: "2026-09-01T00:00:00.000Z",
  };

  assert.equal(getVersionTimestamp(version), Date.parse(version.uploadedAt));
  assert.equal(isVersionRecent(version, now), false);
  assert.equal(isVersionExpired(version, now), true);
});

test("version retention keeps the exact seven-day boundary", () => {
  const version = {
    name: "v1.0.0",
    createdAt: "2026-09-07T12:00:00.000Z",
    uploadedAt: null,
  };

  assert.equal(isVersionRecent(version, now), true);
  assert.equal(isVersionExpired(version, now), false);
});

test("invalid timestamps are neither recent nor eligible for cleanup", () => {
  const version = {
    name: "v1.0.0",
    createdAt: "invalid",
    uploadedAt: null,
  };

  assert.equal(getVersionTimestamp(version), null);
  assert.equal(isVersionRecent(version, now), false);
  assert.equal(isVersionExpired(version, now), false);
});

test("semantic version comparison sorts numeric components", () => {
  assert.ok(compareVersionNames("v1.2.0", "v1.1.9") > 0);
  assert.ok(compareVersionNames("v1.0.0", "v2.0.0") < 0);
  assert.equal(compareVersionNames("v1.0.0", "v1.0.0"), 0);
});

test("version summary separates recent, expired, unknown, and latest versions", () => {
  const summary = summarizeVersions("//share/project", [
    {
      name: "v1.0.0",
      description: "",
      operator: "",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "",
      uploadedAt: null,
    },
    {
      name: "v1.1.0",
      description: "",
      operator: "",
      createdAt: "2026-09-14T00:00:00.000Z",
      updatedAt: "",
      uploadedAt: "2026-09-14T00:00:00.000Z",
    },
    {
      name: "v1.0.1",
      description: "",
      operator: "",
      createdAt: "invalid",
      updatedAt: "",
      uploadedAt: null,
    },
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.recentCount, 1);
  assert.deepEqual(summary.expiredVersions, ["v1.0.0"]);
  assert.equal(summary.unknownDateCount, 1);
  assert.equal(summary.latestVersion, "v1.1.0");
});
