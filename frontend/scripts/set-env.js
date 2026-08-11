const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from frontend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

const environmentFilePath = path.join(__dirname, '../src/environments/environment.ts');

// Helper to get command line arguments
function getArgValue(argName) {
  const index = process.argv.indexOf(argName);
  return index !== -1 && index + 1 < process.argv.length ? process.argv[index + 1] : null;
}

const mode = getArgValue('--mode') || 'development';
const isProd = mode === 'production';

const argDevUrl = getArgValue('--dev-url');
const argProdUrl = getArgValue('--prod-url');

const apiUrl = isProd 
  ? (argProdUrl || process.env.API_URL_PROD)
  : (argDevUrl || process.env.API_URL_DEV);

if (!apiUrl) {
  console.warn(`⚠️ Advertencia: ${isProd ? 'API_URL_PROD' : 'API_URL_DEV'} no está definida en el archivo .env!`);
}

const envConfig = `export const environment = {
  production: ${isProd},
  apiUrl: '${apiUrl || ""}',
  useMock: false,
};
`;

// Ensure directory exists
const dir = path.dirname(environmentFilePath);
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(environmentFilePath, envConfig);
console.log(`Generated environment configuration (${mode}) with API URL: ${apiUrl}`);
