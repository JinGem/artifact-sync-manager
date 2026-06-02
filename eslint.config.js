import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import vueParser from "vue-eslint-parser";
import tsParser from "@typescript-eslint/parser";
import * as prettier from "prettier";

// @ts-expect-error - resolveConfig.sync 运行时存在但类型未暴露
const prettierOptions = prettier.resolveConfig.sync(import.meta.dirname);

export default [
  {
    ignores: [
      ".history/**",
      ".codebuddy/**",
      ".workbuddy/**",
      "out/**",
      "release/**",
      "node_modules/**",
      "dist/**",
      "src/renderer/src/styles/element/index.scss",
    ],
  },

  js.configs.recommended,

  {
    files: ["scripts/**/*.cjs"],
    languageOptions: {
      globals: {
        Buffer: "readonly",
        __dirname: "readonly",
        console: "readonly",
        require: "readonly",
        process: "readonly",
        module: "readonly",
        __filename: "readonly",
      },
    },
  },

  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["src/**/*.ts"],
    rules: {
      ...config.rules,
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/preserve-caught-error": "off",
    },
  })),

  {
    files: ["src/renderer/src/**/*.vue"],
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        localStorage: "readonly",
        location: "readonly",
        fetch: "readonly",
        URL: "readonly",
        Event: "readonly",
        HTMLInputElement: "readonly",
        HTMLVideoElement: "readonly",
        HTMLCanvasElement: "readonly",
        Image: "readonly",
        getComputedStyle: "readonly",
        WebGL2RenderingContext: "readonly",
        WebGLProgram: "readonly",
        WebGLShader: "readonly",
        WebGLVertexArrayObject: "readonly",
        WebGLUniformLocation: "readonly",
        WebGLTexture: "readonly",
      },
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      vue: pluginVue,
    },
    rules: {
      ...pluginVue.configs["flat/essential"].reduce((acc, cfg) => ({ ...acc, ...cfg.rules }), {}),
      "vue/comment-directive": "off",
      "vue/multi-word-component-names": "off",
      "vue/no-unused-refs": "warn",
      "vue/attribute-hyphenation": ["warn", "never"],
    },
  },

  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      ...prettierConfig.rules,
      "prettier/prettier": ["warn", prettierOptions],
    },
  },

  {
    files: ["src/main/**/*.ts", "src/preload/**/*.ts"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "no-process-env": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },

  {
    files: ["src/**/*.ts"],
    rules: {
      "preserve-caught-error": "off",
    },
  },
];
