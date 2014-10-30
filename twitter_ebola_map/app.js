var express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  ejs = require('ejs'),
  bodyParser = require('body-parser'),
  passport = require('passport'),
  passportLocal = require('passport-local'),
  flash = require('connect-flash'),
  cookieParser = require('cookie-parser'),
  cookieSession = require('cookie-session'),
  io = require('socket.io').listen(server),
  db = require('./models/index');


app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({extended: true}));


app.use(cookieSession({
  secret: 'thisismysecretkey', // generate a random hash
  name: 'cookie',
  // keep user logged in for one week
  maxage: 604800000
}));


app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


// prepare serialize (grab user id)
passport.serializeUser(function(user, done) {
  console.log('serialize just ran');
  done(null, user.id);
});


// deserialize (check if user id is in the db)
passport.deserializeUser(function(id, done) {
  console.log('deserialize just ran');
  db.User.find({
    where: {
      id: id
    }
  }).done(function(error, user) {
    done(error, user);
  });
});


// set up tweet stream
var Twitter = require('node-tweet-stream'),
  t = new Twitter({
    consumer_key: process.env.TWITTER_KEY,
    consumer_secret: process.env.TWITTER_SECRET,
    token: process.env.TWITTER_TOKEN,
    token_secret: process.env.TWITTER_TOKEN_SECRET
  });


// connect to socket
io.on('connection', function(socket) {
  console.log('user connected');

  socket.on('disconnect', function() {
    console.log('user disconnected');
  });
});


// stream tweets
t.on('tweet', function (tweet) {
  console.log('tweet received', tweet);
  io.sockets.emit('receive_tweet', tweet);
});

// render home page
app.get('/', function(req,res ) {
  res.render('index');

});

// root route automatically tracks tweets from keyword
app.get('/map', function(req, res) {

// set variable for keyword
var searchKey = 'ebola';

  t.track(searchKey);
  console.log('tracking', searchKey);

//render map
  res.render('map');
});


app.get('/signup', function(req, res) {
  if (!req.user) {
    res.render('signup', {username: ''});
  }
  else {
    res.redirect('/map');
  }
});

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});


app.get('/login', function(req, res) {
  if (!req.user) {
    res.render('login', {username: '', message: req.flash('loginMessage')});
  }
  else {
    res.redirect('/map');
  }
});


app.post('/signup', function(req, res) {

  newUsername = req.body.username;
  newPassword = req.body.password;

  db.User.createNewUser(newUsername, newPassword,
    function(err) {
      console.log("THIS IS OUR ERROR",err);
      res.render('signup', {message: err.message, username: newUsername});
    },
    function(success) {
      res.render('login', {message: success.message, username: newUsername});
    }
  );
});


app.post('/login', passport.authenticate('local', {
  successRedirect: '/map',
  failureRedirect: '/login',
  failureFlash: true
}));


app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});


// render 404 page when any other URL attempted
app.get('/*', function(req, res) {
  res.status(404);
  res.render('/404', {isAuthenticated: req.isAuthenticated(),
    user: req.user});
});


server.listen(process.env.PORT || 3000, function(){
  console.log('server started');
});