export const featureFlags = {
  genericCrudUi() {
    if (typeof window === 'undefined') return false;
    const bootstrapOptions = window.MovementEngineer?.bootstrapOptions || {};
    if (bootstrapOptions.enableGenericCrud === true) return true;
    const qs = new URLSearchParams(window.location.search);
    if (qs.get('genericCrud') === '1') return true;
    return window.localStorage.getItem('feature.genericCrudUi') === 'true';
  }
};
