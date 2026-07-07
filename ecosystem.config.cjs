module.exports = {
  apps: [
    {
      name: "diviradar",
      cwd: "/var/www/apps/diviradar",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010 -H 127.0.0.1",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
