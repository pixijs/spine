module.exports = {
    extends: ['@pixi/eslint-config', 'plugin:prettier/recommended'],
    rules: {
        'prettier/prettier': [
            'warn',
            {
                semi: true,
                trailingComma: 'es5',
                singleQuote: true,
                printWidth: 180,
                tabWidth: 4,
                useTabs: false,
            },
        ],

        // special rules because most of this code is lifted from spine
        // I would love to not have to do this, but I don't have the time nor the energy to fix the entire lib. Milton - 2023

        eqeqeq: 0,
        '@typescript-eslint/no-unused-vars': 0,
        '@typescript-eslint/no-empty-function': 0,
        'no-console': 0,
        '@typescript-eslint/no-use-before-define': 0,
        radix: 0,
        'no-eq-null': 0,
        'no-constant-condition': 0,
        'no-prototype-builtins': 0,
        camelcase: 0,
        '@typescript-eslint/ban-ts-comment': 0,
        'no-case-declarations': 0,
        '@typescript-eslint/no-useless-constructor': 0,
        'consistent-return': 0,
        'no-loop-func': 0,
        '@typescript-eslint/ban-types': 0,
        '@typescript-eslint/no-empty-interface': 0,
        '@typescript-eslint/adjacent-overload-signatures': 0,
        'no-fallthrough': 0,
        '@typescript-eslint/no-unused-expressions': 0,
        'max-params': 0,
    },
};
