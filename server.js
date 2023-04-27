require('module-alias/register');
const { initApp } = require('app');
const connectMongoDB = require("@configs/db");

initApp(connectMongoDB);
