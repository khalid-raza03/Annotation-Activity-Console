import '@testing-library/jest-dom'

// Mock localforage
jest.mock('localforage', () => ({
  ready: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  keys: jest.fn(() => Promise.resolve([])),
}))
