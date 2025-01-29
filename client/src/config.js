const env = process.env.NODE_ENV;
console.log('Raw NODE_ENV value:', env);
console.log('Type of NODE_ENV:', typeof env);

// const BACKEND_URL = process.env.NODE_ENV === 'production'
//   ? 'https://maven-backend-x94s.onrender.com'
//   : 'http://localhost:3000';

const BACKEND_URL = 'https://maven-backend-x94s.onrender.com'

// console.log('Environment in config:', process.env.NODE_ENV);
// console.log('BACKEND_URL in config:', BACKEND_URL);

console.log('Version in config: 1.1');
export default BACKEND_URL;