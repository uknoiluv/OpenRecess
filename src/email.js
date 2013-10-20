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

function createCode(answer,gameId, userId){
  return '###'+answer+'-'+gameId+'-'+userId+'-'+md5(answer+'-'+gameId+'-'+userId+'-'+config.emailSecret);
}
function createYesCode(gameId, userId){
  return createCode('YES',gameId,userId);
}
function createNoCode(answer,gameId, userId){
  return createCode('NO',gameId,userId);
}

/*
console.log(parseCode('###YES-524f25c50c7df84815000002-524f266342cb0fbe15000005-31b4a1e5935bebd3a0cf65a60127307d###   '));
console.log(parseCode('###NO-524f25c50c7df84815000002-524f266342cb0fbe15000005-c38ba6175c499bfcfb44f82b16ce8fc5###   '));
*/

function addUserToGame(game,user,callback){
  Game.findOneAndUpdate( {
      _id:game._id
    },
    {
      $pull : { invitedPlayers : user._id },
      $push : { confirmedPlayers : user._id },
      $inc : { confirmedPlayersCount : 1 }
    },
    function(err, thisGame){
      if(err) throw 'Error';
      if (!thisGame) {
        exports.sendSMS('Thanks for the message. Either you already RSVP\'d to this game or you aren\'t authorized to join. ~OpenRecess.com.', digits, twilioPhoneNumber);
      } else {
        var message = 'Game on for ' + thisGame.gameType + ' #' + thisGame.gameCode + ' on ' + moment(thisGame.gameDate).format("L") + ' at ' + thisGame.gameTime + '. Stay tuned for more text message updates.';
        if (message.length > 144) {
          exports.sendSMS(message, digits, twilioPhoneNumber);
        } else {
          exports.sendSMS(message + ' ~OpenRecess.com', digits, twilioPhoneNumber);
        }
      }
    }
  );
};
function removeUserFromGame(game,user,callback){
  Game.findOneAndUpdate({
    _id : game._id
  },
  {
    $pull : {invitedPlayers : user._id}
  }, function(err, data){
    if (err) throw err;
    console.log(data);
    //change
    exports.sendSMS('Thanks for your reply. ' + data.gameType + ' won\'t be the same without you.', digits, twilioPhoneNumber);
  });
}

function processMessage(client, UID) {
  var mailparser = new MailParser();
  client.createMessageStream(UID).pipe(mailparser);
  mailparser.on("end", function (mail_object) {
//        console.log(mail_object);
    var replyParsed = parseCode(mail_object.text);
    if(replyParsed){
      if(/^(YES|NO)$/i.test(replyParsed.answer)){
      async.parallel({
        'userFound':function(cb){
          User.findOne({'_id':replyParsed.userId},cb);
        },
        'gameFound':function(cb){
          Game.findOne({'_id':replyParsed.gameId},cb);
        }
      },function(err,params){
        if(err){
          console.error(err);
        } else {
          if(params.userFound && params.gameFound){


          } else {
          //deleting message because we cannot find game or user
            client.deleteMessage(UID, function (err) {
              if (err) console.error(err);
            });
          }
        }
      });
      } else {
        //strange answer...delete message
          client.deleteMessage(UID, function (err) {
            if (err) console.error(err);
          });
      }
    } else {
      client.deleteMessage(UID, function (err) {
        if (err) console.error(err);
      });
    }
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
    user: config.smtp.username,
    password: config.smtp.password,
    host: config.smtp.host,
  });

exports.sendEmail = function (to, subject, text, callback) {
  var message = email.message.create({
    text: text,
    from: "OpenRecess@gmail.com",
    to: to,
    subject: subject
  });
  smtp.send(message, callback);
};

exports.sendYesNoEmail = function(userObjOrId,gameObjOrId,callback){
  async.parallel({
    'user':function(cb){
      if(typeof userObjOrId === 'object'){
        User.findOne({'_id':userObjOrId._id},cb);
        return;
      } else {
        if(typeof userObjOrId === 'string'){
          User.findOne({'_id':userObjOrId},cb);
          return;
        } else {
          cb(new Error('Wrong user type!'));
        }
      }
    },
    'game':function(cb){
      if(typeof gameObjOrId === 'object'){
        Game.findOne({'_id':gameObjOrId._id},cb);
        return;
      } else {
        if(typeof userObjOrId === 'string'){
          Game.findOne({'_id':gameObjOrId},cb);
          return;
        } else {
          cb(new Error('Wrong user type!'));
          return;
        }
      }
    }
  },function(err,params){
      if(err){
        callback(err);
      } else {
        var text = 'Hello, '+params.user.display_name+'!+\n'+
            'You have been invited to participate in game "'
            +params.game.gameName+'"\n'+
            'If you WANT to participate, reply to this email '+
            'message with message that starts with this code: \n'+
            '\n'+createYesCode(params.game._id,params.user._id)+
            'If you DO NOT WANT to participate, reply to this email '+
            'message with message that starts with this code: \n'
            '\n'+createNoCode(params.game._id,params.user._id)
        ;
        //todo - you can add more text to this message...
        exports.sendEmail(params.user.email, 'Participation in '+params.game.gameName, text, callback);
      }
  };
};

