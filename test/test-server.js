const fs = require('fs');
const http = require('http');
const path = require('path');

const testType = process.argv[2];
const html = fs.readFileSync(path.join(__dirname, 'test.html'));

let jsFilePath;
switch (testType) {
	case 'router': jsFilePath = path.join(__dirname, 'router-test/bundle.js'); break;
	default: jsFilePath = path.join(__dirname, 'blixt-test/bundle.js');
}

http.createServer(function(req, res) {
	if (req.url === '/bundle.js') {
		const js = fs.readFileSync(jsFilePath);
		return res.end(js);
	}
	return res.end(html); // all requests (except request for js) resolve to test.html
}).listen(3000, function() {
	console.log('Test server running on http://localhost:3000');
});