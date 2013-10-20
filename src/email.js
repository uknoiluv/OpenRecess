var User = require('../models/user.js'),
  Game = require('../models/game.js'),
  Message = require('../models/message.js'),
  config = require('../config/config.js'),
  crypto = require('crypto'),
  async = require('async'),
  inbox = require('inbox'),
  inboxClient = inbox.createConnection(false, config.imap.host, {
    secureConnection: true,
    auth: {
      user: config.imap.login,
      pass: config.imap.password
    }
  });

var MailParser = require("mailparser").MailParser;

function md5(str) {
  return crypto.createHash('md5').update(str).digest('hex').toString();
}

/**
 * Parse code from email message
 * @param {string} code
 * @description
 * code is like this
 *              gameId                       userId             sign
 * ###YES-524f25c50c7df84815000002-524f266342cb0fbe15000005-d11e8b7309483b6b3f50f5b7290a0314###
 * ###NO-524f25c50c7df84815000002-524f266342cb0fbe15000005-d11e8b7309483b6b3f50f5b7290a0314###
 *
 * sign = md5('YES-'+gameId+'-'+userId+secret);
 * or
 * sign = md5('NO-'+gameId+'-'+userId+secret);
 * secret is enviroment value emailSecret
 */
function parseCode(code) {
  if(/^###(YES|NO)\-([0-9a-f]+)\-([0-9a-f]+)\-([0-9a-f]+)###/i.test(code)){
    var s = /^###([ysnoa-f0-9\-]+)/i.exec(code),
      tokens = s[1].split('-');

    if(/^(YES|NO)$/.test(tokens[0])){
      if(tokens[3] === md5(''+tokens[0]+'-'+tokens[1]+'-'+tokens[2]+'-'+config.emailSecret)){
        return {
          'answer':tokens[0],
          'gameId':tokens[1],
          'userId':tokens[2]
        }
      }
    }
  }

  return false;
};

/*
console.log(parseCode('###YES-524f25c50c7df84815000002-524f266342cb0fbe15000005-31b4a1e5935bebd3a0cf65a60127307d###   '));
console.log(parseCode('###NO-524f25c50c7df84815000002-524f266342cb0fbe15000005-c38ba6175c499bfcfb44f82b16ce8fc5###   '));
*/
function parseEmail(emailObject,callback){

};

function processMessage(client, UID) {
  var mailparser = new MailParser();
  client.createMessageStream(UID).pipe(mailparser);
  mailparser.on("end", function (mail_object) {
//        console.log(mail_object);
    parseEmail(mail_object, function (err) {
      if (err) console.error(err);
      client.deleteMessage(UID, function (err) {
        if (err) console.error(err);
      });
    });


  });
};


exports.startServer = function () {
  console.log('Mail listener started');
  inboxClient.on("connect", function () {
    console.log('Mailbox connection established ok!');
    inboxClient.openMailbox("INBOX", function (error, info) {
      if (error) throw error;
      inboxClient.on("new", function (message) {
        processMessage(inboxClient, message.UID)
      });
      setInterval(function () {
        inboxClient.listMessages(-10, function (err, mesgs) {
          if (err) throw err;
          for (x in mesgs) {
            processMessage(inboxClient, mesgs[x].UID);
          }
        });
      }, 15000);
    });
  });
  inboxClient.connect();
};

//sending emails
var email = require('emailjs'),
  smtp = email.server.connect({
    user: config.username,
    password: config.password,
    host: config.smtp.host,
  });

//
//server.send(message, function(err, message) {
//  if (err) {
//    return console.error(err);
//  }
//  return console.log("Message sent with id " + message['header']['message-id']);
//});


exports.sendEmail = function (to, subject, text, callback) {
  var message = email.message.create({
    text: text,
    from: "OpenRecess@gmail.com",
    to: to,
    subject: subject
  });
  smtp.send(message, callback);
};

exports.sendYesNoEmail = function(user,game,callback){


};

