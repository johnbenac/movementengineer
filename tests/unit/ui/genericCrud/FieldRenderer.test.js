import { describe, expect, it } from 'vitest';
import { FieldRenderer } from '../../../../src/ui/genericCrud/FieldRenderer.js';

function buildNodeIndex(nodes) {
  return {
    all: nodes
  };
}

describe('FieldRenderer', () => {
  it('renders ref=* suggestions from the node index', () => {
    const nodeIndex = buildNodeIndex([
      { id: 'n1', title: 'First Node', collectionName: 'entities', movementId: 'm1' },
      { id: 'n2', title: 'Other Node', collectionName: 'claims', movementId: 'm2' }
    ]);

    const field = FieldRenderer({
      fieldDef: { ref: '*' },
      value: '',
      onChange: () => {},
      fieldName: 'targetId',
      collectionName: 'notes',
      record: { movementId: 'm1' },
      model: { collections: {} },
      snapshot: {},
      nodeIndex,
      isBodyField: false
    });

    const datalist = field.querySelector('datalist');
    const options = datalist ? Array.from(datalist.querySelectorAll('option')) : [];

    expect(datalist).not.toBeNull();
    expect(options.map(option => option.value)).toEqual(['n1']);
    expect(options[0].label).toContain('entities:n1');
  });
});
