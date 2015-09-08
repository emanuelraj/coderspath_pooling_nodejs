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
 //   password: 'root',
    database: 'pooling',
    port: 3306
  });

connection.connect(function(err) {
  //connected! (unless `err` is set)
  console.log(err);
});

// creating the server ( http://192.168.1.135:8000 )
app.listen(8000);


io.sockets.on('connection', function(socket) {
	console.log("Connected");
	socket.on('new_registration', function (data) {
		console.log("Testing");
		console.log(socket.id);
		console.log("New registration",data);
		data.socket_session_id = socket.id;
		userRegistration(JSON.parse(data), socket.id);
	});
	socket.on('login', function(data){
		data.socket_session_id = socket.id;
		userLogin(JSON.parse(data), socket.id);
	});
	
	socket.on('chat_request',function(data){
		data.socket_session_id = socket.id;
		getUserRecordForChat(JSON.parse(data), socket.id);
	});
	
	socket.on('chat_history',function(data){
		data.socket_session_id = socket.id;
		getChatHistory(JSON.parse(data), socket.id);
	});
	
	socket.on('new_message', function(data){
		data.socket_session_id = socket.id;
		console.log("Contacted");
		sendNewMessage(JSON.parse(data), socket.id);
	});
	
	connectionsArray.push(socket);
});

userRegistration = function(data, socket_session_id){
	console.log("Datas");
	console.log(data.email);
	console.log(data.name);
	console.log(data.password);
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
		console.log(socket_session_id);
		if(users.length > 0){		
			io.to(socket_session_id).emit('registration_response', {status : 0, message: "Email Already Exist!!"});
		}else{
			var md5sum = crypto.createHash('md5');
			var hashed_password = data.password;
			hashed_password = md5sum.update(hashed_password);
			hashed_password = md5sum.digest('hex');
			var insert_new_user = connection.query('insert into users (`name`, `email`, `password`, `socket_session_id`) values ("'+data.name+'", "'+data.email+'", "'+hashed_password+'", "'+socket_session_id+'")');
			user_id = [];
			insert_new_user
			.on('error', function(err) {
				console.log(err);
			})
			.on('result', function(user) {
				console.log(user);
				user_id.push(user.insertId);
			})
			.on('end', function() {
				getListOfUsers(data, socket_session_id, user_id[0]);
			});

		}	
	});
}


getListOfUsers = function(data, socket_session_id, user_id) {
	var get_users = connection.query('select name, id from users where email != "' + data.email+'"');
	users = []; // this array will contain the result of our db query

	get_users
	.on('error', function(err) {
		console.log(err);
	})
	.on('result', function(user) {
		users.push(user);
	})
	.on('end', function() {
		console.log(users);
		if(users.length > 0){
			io.to(socket_session_id).emit('registration_response', {status : 1, message:
						"Registered Successfully.", user_id: user_id, users_list : users});
		} else {
			io.to(socket_session_id).emit('registration_response', {status : 1, message:
										"Registered Successfully.", user_id: user_id});
		}
	});

	console.log("Success sent");
}

userLogin = function(data,socket_session_id){
	console.log(data.email);
	console.log(data.password);
	var check_login = connection.query('select name,email,password,id from users where email ="'+data.email+'"');
	users = []; // this array will contain the result of our db query

	check_login
	.on('error', function(err) {
		console.log(err);
	})
	.on('result', function(user) {
		users.push(user);
	})
	.on('end', function() {
		console.log(users.length);
		var md5sum = crypto.createHash('md5');
		var hashed_password = data.password;
		hashed_password = md5sum.update(hashed_password);
		hashed_password = md5sum.digest('hex');
		console.log(hashed_password);
		console.log(users[0].password);
		if(hashed_password == users[users.length - 1].password){
			console.log({status : 1, message: "Logged in Successfully!!",  user_id : users[users.length - 1].id});
			io.to(socket_session_id).emit('login_response',
			{status : 1, message: "Logged in Successfully!!",  user_id : users[users.length - 1].id});
		}else{
			io.to(socket_session_id).emit('login_response', {status : 0,
			message: "Username or Password Wrong!!"});
		}	
	});
}

getUserRecordForChat = function(data, socket_session_id){
	console.log(data.user_id);
	console.log(socket_session_id);
	var update_user = connection.query('UPDATE users SET socket_session_id = "'+socket_session_id+'" WHERE id = '+data.user_id+'');
	var user_details = connection.query('select name,id from users where id != "'+data.user_id+'"');
	users = []; // this array will contain the result of our db query

	user_details
	.on('error', function(err) {
		console.log(err);
	})
	.on('result', function(user) {
		users.push(user);
	})
	.on('end', function() {
		console.log({status : 1, message: "online user details", user_details: users});
		io.to(socket_session_id).emit('online_user_details', {status : 1, message: "online user details", users_list: users});
	});
}

getChatHistory = function(data,socket_session_id){
	console.log("Chat History");
	console.log(data.user_id);
	console.log(data.sender_id);
	var update_user = connection.query('UPDATE users SET socket_session_id = "'+socket_session_id+'" WHERE id = '+data.user_id+'');
	var user_conversation_id = connection.query('select * from conversation_user_mapping where ((from_id = "'+data.user_id+'" and to_id = "'+data.sender_id+'") OR (from_id = "'+data.sender_id+'" and to_id = "'+data.user_id+'"))');
	
	users = []; // this array will contain the result of our db query
	
	user_conversation_id
	.on('error', function(err) {
		console.log(err);
	})
	.on('result', function(user) {
		users.push(user);
	})
	.on('end', function() {
		if(users.length > 0){
			console.log(users[0].id);
			var get_chat_history = connection.query('select sender_id, message from chat where conversation_id = "'+users[0].id+'"');
			
			chat_history = []; // this array will contain the result of our db query
			get_chat_history
			.on('error', function(err) {
				console.log(err);
			})
			.on('result', function(user) {
				//console.log(user);
				chat_history.push(user);
			})
			.on('end', function() {
				io.to(socket_session_id).emit('chat_history_response', {status : 1, message: chat_history});
			});
			
		}else{
			io.to(socket_session_id).emit('chat_history_response', {status : 2, message: "No Previous Chat History"});
		}
	});
}

sendNewMessage = function(data, socket_session_id){
	var user_conversation_id = connection.query('select * from conversation_user_mapping where ((from_id = "'+data.user_id+'" and to_id = "'+data.sender_id+'") OR (from_id = "'+data.sender_id+'" and to_id = "'+data.user_id+'"))');
	
	users = []; // this array will contain the result of our db query
	
	user_conversation_id
	.on('error', function(err) {
		console.log(err);
	})
	.on('result', function(user) {
		users.push(user);
	})
	.on('end', function() {
		if(users.length > 0){
			console.log(users[0].id);
			var new_message_insertation = connection.query('insert into chat (`conversation_id`, `sender_id`, `message_type`, `message`) values ("'+users[0].id+'", "'+data.user_id+'", "1" ,"'+data.message+'")');
				
			var get_socket_session_id = connection.query('select socket_session_id from users where id = "'+data.sender_id+'"');
			
			to_id = []; // this array will contain the result of our db query
			get_socket_session_id
			.on('error', function(err) {
				console.log(err);
			})
			.on('result', function(user) {
				//console.log(user);
				to_id.push(user);
			})
			.on('end', function() {
				console.log(to_id[0]);
				console.log({status : 1, message: data.message, sender_id: data.user_id});
				io.to(to_id[0].socket_session_id).emit('chat_history_response', {status : 1, message: data.message,sender_id: data.user_id});
			});
		}else{
			var conversation_id = connection.query('insert into conversation_user_mapping (`from_id`, `to_id`) values ("'+data.user_id+'", "'+data.sender_id+'")');
			conversation_ids = []; // this array will contain the result of our db query
			
			conversation_id
			.on('error', function(err) {
				console.log(err);
			})
			.on('result', function(user) {
				console.log(user);
				conversation_ids.push(user.insertId);
			})
			.on('end', function() {
				console.log(conversation_ids);
				var new_message_insertation = connection.query('insert into chat (`conversation_id`, `sender_id`, `message_type`, `message`) values ("'+conversation_ids+'", "'+data.user_id+'", "1" ,"'+data.message+'")');
				
				var get_socket_session_id = connection.query('select socket_session_id from users where id = "'+data.sender_id+'"');
				
				to_id = []; // this array will contain the result of our db query
				get_socket_session_id
				.on('error', function(err) {
					console.log(err);
				})
				.on('result', function(user) {
					//console.log(user);
					to_id.push(user);
				})
				.on('end', function() {
					console.log(to_id[0]);
					console.log({status : 1, message: data.message,sender_id: data.user_id});
					io.to(to_id[0].socket_session_id).emit('chat_history_response', {status : 1, message: data.message,sender_id: data.user_id});
				});
			});
		}
	});
}