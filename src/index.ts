const dotenv = require("dotenv");
const path = require("path");

if (process.env.NODE_ENV === "development") {
  dotenv.config({ path: path.resolve(__dirname, `../.env`) });
}

if (!!process.env.COMPOSE) {
  dotenv.config({ path: path.resolve(__dirname, `../.env.compose`) });
}

if (!!process.env.CI) {
  require("./compile-check").main();
} else {
  require("./bootstrap").main();
}
