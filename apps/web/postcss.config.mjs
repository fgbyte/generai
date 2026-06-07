export default {
  plugins: {
    "@tailwindcss/postcss": {},
    autoprefixer: {},
    "postcss-preset-env": {
      stage: 2,
      features: {
        "custom-properties": true,
        "nesting-rules": true,
      },
      browsers: "chrome 91",
    },
  },
};
