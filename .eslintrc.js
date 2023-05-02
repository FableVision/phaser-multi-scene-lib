// eslint-disable-next-line
module.exports = {
    // don't need to look higher up than this project to see if anything else adds to it
    root: true,
    // need the typescript parser for eslint, otherwise eslint doesn't understand typescript
    parser: '@typescript-eslint/parser',
    // include all the typescript rules (that understand typescript or are specific to typescript)
    plugins: [
        '@typescript-eslint',
    ],
    // as a base, use recommended rules
    extends: [
        'eslint:recommended',
        'plugin:@typescript-eslint/recommended',
    ],
    rules: {
        // single quotes and backticks, please!
        'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
        // 4 space indents
        '@typescript-eslint/indent': ['error', 4],
        // Typescript specific: allow one type of "/// <ref>" imports, because they are often useful
        '@typescript-eslint/triple-slash-reference': ['error', {path:'always'}],
        // Typescript specific: Andrew prefers namespaces over static classes
        '@typescript-eslint/no-namespace': ['off'],
        // Curly braces go on their own lines, but are not required for single lines (ex: if (true) return;)
        // '@typescript-eslint/brace-style': ['error', 'allman'],
        // Allow explicit any types (although they are not preferable)
        '@typescript-eslint/no-explicit-any': ['off'],
        // No unused vars, unless they start with an underscore (usually function parameters)
        '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
        // Always use trailing comma on multiline arrays/property lists
        '@typescript-eslint/comma-dangle': ['error', 'always-multiline'],
        // Always use a semicolon where appropriate
        '@typescript-eslint/semi': ['error'],
        // Always use a space after keywords like if, for, switch, etc.
        '@typescript-eslint/keyword-spacing': ['error', {after: true}],
        // we are allowed to use the ! assertion
        '@typescript-eslint/no-non-null-assertion': ['off'],
        // Naming Conventions! - note that they are warn, because an error would often get in the way
        // of development
        '@typescript-eslint/naming-convention': ['warn',
            {
                // Unless otherwise specified, use camelcase
                selector: 'default',
                format: ['camelCase'],
            },
            {
                // Classes, Enums, Interfaces, etc are PascalCase
                selector: ['class', 'enumMember', 'interface', 'enum', 'typeAlias', 'typeParameter'],
                format: ['PascalCase'],
            },
            {
                // global variables (generally constants) should be all UPPER_CASE
                selector: 'variable',
                modifiers: ['global'],
                format: ['UPPER_CASE'],
            },
            {
                // global variables that _are_ exported are allowed to be camelCase, because sometimes
                // that is more appropriate
                selector: 'variable',
                modifiers: ['global', 'exported'],
                format: ['UPPER_CASE', 'camelCase'],
            },
            {
                // private class properties may have an _camelCase variable (like _x with an x() getter/setter)
                selector: 'property',
                modifiers: ['protected'],
                format: ['camelCase'],
                leadingUnderscore: 'allow',
            }, {
                // private class properties may have an _camelCase variable (like _x with an x() getter/setter)
                selector: 'property',
                modifiers: ['private'],
                format: ['camelCase'],
                leadingUnderscore: 'allow',
            },
            // Unused parameters get to also be _camelCase (because we are marking them as unused but OK)
            {
                selector: 'parameter',
                modifiers: ['unused'],
                format: ['camelCase'],
                leadingUnderscore: 'allow',
            },
            // in object literals and interfaces, snake_case and PascalCase are also allowed, because
            // there we may be dealing with sending/getting JSON data to other people's APIs or
            // interacting with JSON that we don't have direct control over the creation of.
            {
                selector: ['objectLiteralProperty', 'typeProperty'],
                format: ['camelCase', 'snake_case', 'PascalCase'],
                leadingUnderscore: 'allow',
            },
        ],
        '@typescript-eslint/no-inferrable-types': [
            'warn', {
                ignoreProperties: true,
            },
        ],
    },
    // in javascript, allow "const fs = require('fs')" for greater Node compatibility
    overrides: [{
        files: ['*.js'],
        rules: {
            '@typescript-eslint/no-var-requires': ['off'],
        },
    }],
};