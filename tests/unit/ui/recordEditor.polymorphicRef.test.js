import { describe, expect, it, beforeAll } from 'vitest';
import { createRequire } from 'module';
import { RecordEditor } from '../../../src/ui/genericCrud/RecordEditor.js';
import { PluginProvider } from '../../../src/core/plugins/PluginProvider.js';

const require = createRequire(import.meta.url);
const DATA_MODEL_V2_3 = require('../../../src/models/dataModel.v2_3.js');
globalThis.DATA_MODEL_V2_3 = DATA_MODEL_V2_3;
const ModelRegistry = require('../../../src/core/modelRegistry');

describe('RecordEditor polymorphic ref fields', () => {
  beforeAll(() => {
    globalThis.ModelRegistry = ModelRegistry;
  });

  it('updates ref options when discriminator changes', () => {
    const model = ModelRegistry.getModel('2.3');
    const snapshot = {
      specVersion: '2.3',
      movements: [{ id: 'm1', movementId: 'm1', name: 'One' }],
      texts: [{ id: 't1', movementId: 'm1', title: 'Root' }],
      entities: [{ id: 'e1', movementId: 'm1', name: 'Entity' }]
    };

    const record = {
      id: 'n1',
      movementId: 'm1',
      targetType: 'TextNode',
      targetId: 't1',
      body: 'Note text'
    };

    PluginProvider({
      plugins: {
        getFieldWidget: () => null
      }
    });

    const editor = RecordEditor({
      record,
      collectionName: 'notes',
      collectionDef: model.collections.notes,
      model,
      snapshot,
      currentMovementId: 'm1',
      mode: 'edit',
      onSave: () => {},
      onCancel: () => {}
    });

    document.body.innerHTML = '';
    document.body.appendChild(editor);

    const targetTypeRow = document.querySelector('[data-testid="generic-crud-field-targetType"]');
    const targetIdRow = document.querySelector('[data-testid="generic-crud-field-targetId"]');
    const initialOptions = Array.from(targetIdRow.querySelectorAll('datalist option')).map(
      option => option.value
    );
    expect(initialOptions).toEqual(['t1']);

    const targetTypeSelect = targetTypeRow.querySelector('select');
    targetTypeSelect.value = 'Entity';
    targetTypeSelect.dispatchEvent(new Event('change', { bubbles: true }));

    const updatedTargetIdRow = document.querySelector('[data-testid="generic-crud-field-targetId"]');
    const updatedOptions = Array.from(updatedTargetIdRow.querySelectorAll('datalist option')).map(
      option => option.value
    );
    expect(updatedOptions).toEqual(['e1']);

    const targetIdInput = updatedTargetIdRow.querySelector('input');
    expect(targetIdInput.value).toBe('');
  });
});
