var app = require('http').createServer(),
  io = require('socket.io').listen(app),
  crypto = require('crypto'),
  fs = require('fs'),
  http = require('http'),
  mysql = require('mysql'),
  connectionsArray = [],
  connection = mysql.createConnection({
    host: '127.0.0.1',
    user: 'root',
    password: '',
    database: 'pooling',
    port: 3306
  });

connection.connect(function(err) {
  //connected! (unless `err` is set)
  console.log(err);
});

// creating the server ( localhost:8000 )
app.listen(8000);


io.sockets.on('connection', function(socket) {
	
	socket.on('new_registration', function (data) {
		data.socket_session_id = socket.id;
		userRegistration(data);
	});
	connectionsArray.push(socket);
});

userRegistration = function(data){
	var md5sum = crypto.createHash('md5');
	var hashed_password = data.password;
	hashed_password = md5sum.update(hashed_password);
	hashed_password = md5sum.digest('hex');
	var insert_new_user = connection.query('insert into users (`name`, `email`, `password`, `socket_session_id`) values ("'+data.name+'", "'+data.email+'", "'+hashed_password+'", "'+data.socket_session_id+'")');
}
