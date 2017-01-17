function (db, nodeRequire, Q, _) {
    var exports = {};
    var nodemailer = nodeRequire('nodemailer');
    var handlebars = nodeRequire('handlebars');
    
    exports.sendEmail = function(transportId, messageId, contextObj, recipients) {
        console.log('email %s %s %j', transportId, messageId, contextObj);
        var deferred = Q.defer();
        
        var transportObj;
        var messageObj;
        
        Q.all([
            db.EmailTransport.findOne({_id:transportId}), 
            db.EmailMessage.findOne({_id:messageId})
        ])
        .then(function(resultArr) {
            transportObj = resultArr[0];
            messageObj = resultArr[1];
            
            if(!transportObj) {
                throw deferred.reject('Invalid transport id '+transportId);
            }
            if(!messageObj) {
                throw deferred.reject('Invalid message id '+messageId);
            }
            if(!messageObj.recipients && !recipients) {
                throw deferred.reject('Message '+messageId+' missing recipient list');
            }
            
            if(messageObj.recipients) {
                return db.EmailRecipientList.findOne({_id:messageObj.recipients._id});
            }
            else {
                return false;
            }
            
            
        })
        .then(function(recipientListObj) {
            if(!recipientListObj && !recipients) {
                throw deferred.reject('Message '+messageId+' has invalid recipient list ref');
            }
            
            if(recipients) {
                console.log('RECIPIENTS PASSED IN: %j', recipients);
                return recipients;
            }
            
            return recipientListObj.addresses;
        })
        .then(function(emailAddressArr) {
            console.log(emailAddressArr);
            if(!emailAddressArr || emailAddressArr.length === 0) {
                throw deferred.reject('No recipients found for message '+messageId);
            }
            
            var transporter = nodemailer.createTransport(transportObj.config);
            var mailObj = transportObj.options || {};
            mailObj.to = emailAddressArr.join();
            
            if(contextObj) {
                var subjTemplate = handlebars.compile(messageObj.subject);
                var bodyTemplate = handlebars.compile(messageObj.body);
                mailObj.subject = subjTemplate(contextObj);
                mailObj.text = bodyTemplate(contextObj);
            }
            else{
                mailObj.subject = messageObj.subject;
                mailObj.text = messageObj.body;
            }
            console.log('sending %j', mailObj);
            transporter.sendMail(
                mailObj, 
                function(err, info) {
                    if(err) {
                        deferred.reject(err);
                    }
                    deferred.resolve(info);
                }
            );
        })
        ;
        
        
        return deferred.promise;
    };
    
    
    return exports;
}