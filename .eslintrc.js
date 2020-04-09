module.exports = {
  root: true,
  env: {
    node: true,
    jest: true,
  },
  extends: ['xo-space/esnext', 'xo-typescript'],
  rules: {
    'object-curly-spacing': ['error', 'always'],
    '@typescript-eslint/indent': ['error', 2, { SwitchCase: 1 }],
    '@typescript-eslint/explicit-function-return-type': 0,
    'capitalized-comments': 0,
    '@typescript-eslint/no-explicit-any': 0,
    'comma-dangle': ['error', 'always-multiline'],
    '@typescript-eslint/strict-boolean-expressions': 0,
    '@typescript-eslint/no-unnecessary-condition': 0,
    '@typescript-eslint/prefer-optional-chain': 0,
    '@typescript-eslint/restrict-template-expressions': 0,
    '@typescript-eslint/no-unsafe-member-access': 0,
    '@typescript-eslint/no-unsafe-call': 0,
    '@typescript-eslint/no-unsafe-return': 0,
  },
};
