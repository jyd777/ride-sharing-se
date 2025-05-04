const config = {
	development: {
		BASE_URL: "http://100.78.83.203:5000/api",
		SOCKET_URL: "http://100.78.83.203:5000"
	},
	production: {
		BASE_URL: "http://100.78.83.203:5000/api",
		SOCKET_URL: "http://100.78.83.203:5000"
	}
}

// const env = 'development'; // 开发
const env = 'production';  // 生产
export default config[env];