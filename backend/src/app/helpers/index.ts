const helpers = {
  isDev: (process.env.NODE_ENV === 'development'),
  isProd: (process.env.NODE_ENV === 'production'),
};

export default helpers;
