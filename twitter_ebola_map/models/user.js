var bcrypt = require('bcrypt'),
  salt = bcrypt.genSaltSync(10),
  passport = require('passport'),
  passportLocal = require('passport-local');

module.exports = function(sequelize, DataTypes) {

  var User = sequelize.define('user', {
    username: {
      type: DataTypes.STRING,
      unique: true,
      validate: {
        notNull: false,
        len: [6, 30]
      }
    },
    password: {
      type: DataTypes.STRING,
      validate: {
        notEmpty: true
      }
    },
    defaultSearch: {
      type: DataTypes.STRING
    }
  },
    {
      classMethods: {
        // encrypt a password
        encryptPass: function(password) {
          var hash = bcrypt.hashSync(password, salt);
          return hash;
        },
        // compare a password
        comparePass: function(userpass, dbpass) {
          return bcrypt.compareSync(userpass, dbpass);
        },
        // create a new user
        createNewUser: function(username, password, defaultSearch, err, success) {
          if (password.length < 6) {
            err({message: 'Your password should be more than 6 characters.'});
          }
          else {
            User.create({
              username: username,
              password: User.encryptPass(password),
              defaultSearch: defaultSearch
            }).error(function(error) {
              if (error.username) {
                err({message: 'Your username should be at least 6 characters.'});
              }
              else {
                err({message: 'An account with that username already exists.'});
              }
            }).success(function(user) {
              success({message: 'Account created, please log in now.'});
            });
          }
        }
      }
    }
  );

  passport.use(new passportLocal.Strategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
  },
  function(req, username, password, done) {
    // find a user in the db
    User.find({
      where: {
        username: username
      }
    })
    // done(err) // db issues
    // done(null, false) // no db issues, but user enters incorrect info
    // done(null, user) // no db issues, and user enters correct info
    // when that's done...
    .complete(function(error, user) {
      if (error) {
        console.log(error);
        return done(err, req.flash('loginMessage', 'Oops! Something went wrong on our end!'));
      }
      if (user === null) {
        return done(null, false, req.flash('loginMessage', 'Username does not exist.'));
      }
      if (User.comparePass(password, user.password) !== true) {
        return done(null, false, req.flash('loginMessage', 'Invalid password. Please try again.'));
      }
      done(null, user);
    });
  }));

  return User;
};