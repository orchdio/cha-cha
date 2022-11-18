module.exports = {
    parser: "@typescript-eslint/parser",
    plugins: ["@typescript-eslint"],
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module"
    },
    extends: ["eslint:recommended"],
    env: {
        node: true,
    },
    rules: {
        
    }
}