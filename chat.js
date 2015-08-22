var app = require('http').createServer(),
  crypto = require('crypto'),
  fs = require('fs'),
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

var md5sum = crypto.createHash('md5');

var hashed_password = "Allen";
hashed_password = md5sum.update(hashed_password);
hashed_password = md5sum.digest('hex');



var insert_new_user = connection.query('insert into users (`name`, `email`, `password`) values ("Allen", "raju.allen1888@gmail.com", "'+hashed_password+'")');