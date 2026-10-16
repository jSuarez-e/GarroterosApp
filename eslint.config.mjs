import jsdoc from "eslint-plugin-jsdoc";
import sonarjs from "eslint-plugin-sonarjs";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

export default [
  // 1. ESCUDO GLOBAL (Debe ser el primer objeto y solo contener "ignores")
  {
    ignores: [
      "**/node_modules/**",
      "node_modules/",
      "**/dist/**",
      "dist/",
      "backend/dist/",
      "backend/dist/**", // Fuerza bruta para el backend
      "frontend/dist/",
      "frontend/dist/**", // Fuerza bruta para el frontend
      "frontend/.angular/",
      "frontend/.angular/**", // Ignora la cache de Angular/Vite de forma absoluta
      "frontend/android/**",  // Ignora plataforma nativa Android y sus artefactos Gradle
      "**/android/**",
      "**/build/**",
      "build/",
      "**/www/**",
      "**/docs/**",
      "**/*.d.ts",       // Ignora CUALQUIER mapa de tipos generado
      "**/*.js",         // Ignora CUALQUIER javascript compilado
      "**/.agents/**",
      "**/.antigravityignore",
      "**/*.db",
      "**/*.env",
      "**/*.env.example",
      "**/*.log",
      "**/coverage/**",
      "eslint.config.mjs", // Ignorar este mismo archivo para que no lo audite
      "scripts/**"         // Ignorar tus scripts de node (.mjs)
    ]
  },
  // 2. REGLAS PARA EL CÓDIGO FUENTE (Solo afecta a TypeScript)
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest",
        createDefaultProgram: true 
      }
    },
    settings: {
      jsdoc: {
        mode: "typescript"
      }
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "jsdoc": jsdoc,
      "sonarjs": sonarjs
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
      "sonarjs/cognitive-complexity": ["error", 15],
      "jsdoc/require-jsdoc": ["error", {
        "require": {
          "FunctionDeclaration": true,
          "MethodDefinition": true,
          "ClassDeclaration": true,
          "ArrowFunctionExpression": true,
          "FunctionExpression": true
        },
        "contexts": [
          "TSInterfaceDeclaration",
          "TSTypeAliasDeclaration",
          "TSPropertySignature",
          "TSMethodSignature",
          "PropertyDefinition"
        ],
        "publicOnly": false
      }],
      "jsdoc/require-description": "warn",
      "jsdoc/require-param": "warn",
      "jsdoc/require-returns": "warn"
    }
  }
];