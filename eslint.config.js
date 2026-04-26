import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default [
    js.configs.recommended,
    prettierConfig,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node,
                d3: "readonly",
                PIXI: "readonly",
                Vue: "readonly",
                _: "readonly",
                utils: "readonly",
                Canvas: "readonly",
                Timeline: "readonly",
                Search: "readonly",
                Loader: "readonly",
                LoaderSprites: "readonly",
                Crossfilter: "readonly",
                TagsHierarchical: "readonly",
                Tags: "readonly",
                Modernizr: "readonly",
                marked: "readonly",
                canvas: "readonly",
                timeline: "readonly",
                search: "readonly",
                tags: "readonly",
                detailVue: "readonly",
                pixiPackerParser: "readonly",
                ping: "readonly",
                interaction: "readonly",
            },
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "no-undef": "off",
            "no-prototype-builtins": "off",
            "no-empty": "off",
            "no-useless-assignment": "off",
            "no-global-assign": "off",
        },
    },
    {
        ignores: ["node_modules/", "dist/"],
    },
];
