module.exports = {
  extends: ['react-app'],
  overrides: [
    {
      files: ['src/App.js', 'src/**/*.js'],
      "rules": {
        "react/react-in-jsx-scope": "off",
        "react/jsx-uses-react": "off"
      },
    },
    {
      "extends": ["plugin:react/jsx-runtime"]
    }
  ],
};