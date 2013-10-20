var config = {};

config.db = {};

config.db = process.env['MONGOLAB_URI'] || 'mongodb://localhost/openRecess';
config.port = process.env.PORT || 5000;

config.twilioSID = process.env.TWILIO_ACCOUNT_SID || '1234';
config.twilioAuth = process.env.TWILIO_AUTH_TOKEN || '1234';
config.twilioNumber = '+14248887537';

config.emailSecret = process.env.EMAIL_SECRET || 'emailSecret';
config.imap = {
  "host": "imap.gmail.com",
  "login": process.env.emailLogin || "OpenRecess@gmail.com",
  "password": process.env.emailPassword || "testpassword"
};

config.smtp = {
  "host":"smtp.gmail.com",
  "login": process.env.emailLogin || "OpenRecess@gmail.com",
  "password": process.env.emailPassword || "testpassword"
};


module.exports = config;
