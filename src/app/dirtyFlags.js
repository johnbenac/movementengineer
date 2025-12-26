export function ensureFlags(flags = {}) {
  const next = {
    snapshotDirty: !!flags.snapshotDirty,
    movementFormDirty: !!flags.movementFormDirty,
    itemEditorDirty: !!flags.itemEditorDirty,
    isPopulatingMovementForm: !!flags.isPopulatingMovementForm,
    isPopulatingEditor: !!flags.isPopulatingEditor,
    isPopulatingCanonForms: !!flags.isPopulatingCanonForms,
    isCanonMarkdownInitialized: !!flags.isCanonMarkdownInitialized,
    isCanonCollectionInputsInitialized: !!flags.isCanonCollectionInputsInitialized
  };
  next.snapshotDirty = next.snapshotDirty || next.movementFormDirty || next.itemEditorDirty;
  next.isDirty = next.snapshotDirty || next.movementFormDirty || next.itemEditorDirty;
  return next;
}
