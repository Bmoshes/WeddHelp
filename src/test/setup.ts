import '@testing-library/jest-dom';

// Suppress jsdom "Not implemented" warnings for window.alert/confirm/prompt.
// These are replaced by React UI in the app; mocking them avoids console noise.
window.alert = () => {};
window.confirm = () => true;
window.prompt = () => null;
