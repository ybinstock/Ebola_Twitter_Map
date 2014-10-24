"use strict";

module.exports = function(sequelize, DataTypes) {
  var usermodel = sequelize.define("usermodel", {
    username: DataTypes.STRING,
    password: DataTypes.STRING
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });

  return usermodel;
};
