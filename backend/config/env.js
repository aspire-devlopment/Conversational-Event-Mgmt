/**
 * Load backend environment variables regardless of the process working directory.
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '..', '.env'),
});
