const config = {
	development: {
		BASE_URL: "http://localhost:5000/api",
		SOCKET_URL: "http://localhost:5000"
	},
	production: {
		BASE_URL: "http://100.80.119.36:5000/api",
		SOCKET_URL: "http://100.80.119.36:5000"
	}
}

// const env = 'development'; // 开发
const env = 'production';  // 生产
export default config[env];