const crypto = require("crypto");

const generatePassword = () => {
  return crypto.randomBytes(6).toString("hex"); 
  // generates 12 character password
};

module.exports = generatePassword;
