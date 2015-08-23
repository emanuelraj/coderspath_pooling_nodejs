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
		console.log("Testing");
		data.socket_session_id = socket.id;
		userRegistration(data);
	});
	socket.on('login', function(data){
		data.socket_session_id = socket.id;
		userLogin(data);
	});
	
	socket.on('chat_request',function(data){
		data.socket_session_id = socket.id;
		getUserRecordForChat(data);
	});
	connectionsArray.push(socket);
});

userRegistration = function(data){
	var check_user = connection.query('select * from users where email = "'+data.email+'"');
	users = []; // this array will contain the result of our db query

	check_user
	.on('error', function(err) {
		console.log(err);
	})
	.on('result', function(user) {
		users.push(user);
	})
	.on('end', function() {
		console.log(users.length);
		if(users.length > 0){		
			io.sockets.socket(data.socket_session_id).emit('registration_response', {status : 0, message: "Email Already Exist!!"});
		}else{
			var md5sum = crypto.createHash('md5');
			var hashed_password = data.password;
			hashed_password = md5sum.update(hashed_password);
			hashed_password = md5sum.digest('hex');
			var insert_new_user = connection.query('insert into users (`name`, `email`, `password`, `socket_session_id`) values ("'+data.name+'", "'+data.email+'", "'+hashed_password+'", "'+data.socket_session_id+'")');
			io.sockets.socket(data.socket_session_id).emit('registration_response', {status : 1, message: "Registered Successfully!!!!"});
		}	
	});
}

userLogin = function(data){
	var check_login = connection.query('select * from users where email = "'+data.email+'"');
	users = []; // this array will contain the result of our db query

	check_login
	.on('error', function(err) {
		console.log(err);
	})
	.on('result', function(user) {
		users.push(user);
	})
	.on('end', function() {
		//console.log(users.length);
		var md5sum = crypto.createHash('md5');
		var hashed_password = data.password;
		hashed_password = md5sum.update(hashed_password);
		hashed_password = md5sum.digest('hex');
		console.log(hashed_password);
		console.log(users[users.length - 1].password);
		if(hashed_password == users[users.length - 1].password){
			io.sockets.socket(data.socket_session_id).emit('login_response', {status : 1, message: "Logged in Successfully!!", user_details: users});
		}else{
			io.sockets.socket(data.socket_session_id).emit('login_response', {status : 0, message: "Username or Password Wrong!!"});
		}	
	});
}

getUserRecordForChat = function(data){
	var update_user = connection.query('UPDATE users SET socket_session_id = "'+data.socket_session_id+'" WHERE id = '+data.user_id+''); 
	var user_details = connection.query('select * from users where id != "'+data.user_id+'"');
	users = []; // this array will contain the result of our db query

	user_details
	.on('error', function(err) {
		console.log(err);
	})
	.on('result', function(user) {
		users.push(user);
	})
	.on('end', function() {
		io.sockets.socket(data.socket_session_id).emit('online_user_details', {status : 1, message: "online user details", user_details: users});
	});
}