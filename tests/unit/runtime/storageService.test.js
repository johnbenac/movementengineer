import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../..');

function evalScript(relativePath) {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  window.eval(source);
}

function loadStorageService() {
  delete window.DATA_MODEL_V2_3;
  delete window.ModelRegistry;
  delete window.MovementEngineerBundledDefaultSnapshot;
  delete window.StorageService;

  evalScript('src/models/dataModel.v2_3.js');
  evalScript('src/core/modelRegistry.js');
  evalScript('src/runtime/bundledDefaultSnapshot.js');
  evalScript('src/runtime/storageService.js');

  return window.StorageService;
}

describe('StorageService bundled defaults', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('loads the Catholic markdown repository as the default snapshot', () => {
    const StorageService = loadStorageService();
    const snapshot = StorageService.getDefaultSnapshot();

    expect(snapshot.movements).toHaveLength(1);
    expect(snapshot.movements[0]).toMatchObject({
      id: 'mov-catholic',
      name: 'Roman Catholic Church'
    });
    expect(snapshot.entities.length).toBeGreaterThan(20);
    expect(snapshot.texts.length).toBeGreaterThan(10);
    expect(snapshot.claims.length).toBeGreaterThan(5);
    expect(snapshot.__repoInfo).toMatchObject({
      owner: 'johnbenac',
      repo: 'catholic',
      bundled: true
    });
    expect(Object.keys(snapshot.__repoRawMarkdownByPath)).toHaveLength(73);
    expect(snapshot.__repoBaselineByMovement['mov-catholic'].entities['ent-jesus-christ']).toBeTruthy();
  });

  it('upgrades the previous one-record Catholic placeholder in localStorage', () => {
    const StorageService = loadStorageService();
    window.localStorage.setItem(
      StorageService.STORAGE_KEY,
      JSON.stringify({
        version: '2.3',
        specVersion: '2.3',
        __repoInfo: null,
        __repoSource: null,
        __repoFileIndex: {},
        __repoRawMarkdownByPath: {},
        __repoBaselineByMovement: {},
        movements: [
          {
            id: 'mov-catholic',
            movementId: 'mov-catholic',
            name: 'Roman Catholic Church'
          }
        ]
      })
    );

    const snapshot = StorageService.loadSnapshot();

    expect(snapshot.movements).toHaveLength(1);
    expect(snapshot.entities.length).toBeGreaterThan(20);
    expect(Object.keys(snapshot.__repoRawMarkdownByPath)).toHaveLength(73);
  });

  it('replaces an empty saved snapshot with bundled default data', () => {
    const StorageService = loadStorageService();
    window.localStorage.setItem(
      StorageService.STORAGE_KEY,
      JSON.stringify({
        version: '2.3',
        specVersion: '2.3',
        __repoInfo: null,
        __repoSource: null,
        __repoFileIndex: {},
        __repoRawMarkdownByPath: {},
        __repoBaselineByMovement: {},
        movements: []
      })
    );

    const snapshot = StorageService.loadSnapshot();

    expect(snapshot.movements[0]).toMatchObject({
      id: 'mov-catholic',
      name: 'Roman Catholic Church'
    });
    expect(snapshot.entities.length).toBeGreaterThan(20);
    expect(Object.keys(snapshot.__repoRawMarkdownByPath)).toHaveLength(73);
  });

  it('preserves an intentionally cleared empty workspace', () => {
    const StorageService = loadStorageService();
    window.localStorage.setItem(
      StorageService.STORAGE_KEY,
      JSON.stringify({
        version: '2.3',
        specVersion: '2.3',
        __repoInfo: null,
        __repoSource: null,
        __repoFileIndex: {},
        __repoRawMarkdownByPath: {},
        __repoBaselineByMovement: {},
        __userClearedWorkspace: true,
        movements: []
      })
    );

    const snapshot = StorageService.loadSnapshot();

    expect(snapshot.movements).toEqual([]);
    expect(snapshot.entities).toEqual([]);
    expect(snapshot.__userClearedWorkspace).toBe(true);
  });
});
