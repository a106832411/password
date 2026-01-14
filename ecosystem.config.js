module.exports = {
  apps: [
    {
      name: "Nologin",
      script: "npm",
      args: "run start -- --port=3009",
      env: {
        PORT: 3009,
      },
    },
  ],
};
