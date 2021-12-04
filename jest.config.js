module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/*.jstest.js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
