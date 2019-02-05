function (db, Q, _) {
    const exports = {};
    const nodemailer = require('nodemailer');
    const handlebars = require('handlebars');
    
    const gridFs = db._svc.GridFsService;
    
    //From gridfs attachments create a list of nodemailer attachments
    //
    const buildAttachmentsList = function(attachmentList) {
        var promiseChain = Q(true);
        const ret = [];
        
        const addFile = function(id, name) {
            return gridFs.getFile(id).then(r=>{
                ret.push({
                    content:r.readstream,
                    filename:name
                });
            });
        }
        _.forEach(attachmentList, att=>{
            promiseChain = promiseChain.then(addFile.bind(null,att.attachment_id,att.filename));
        });
        promiseChain = promiseChain.then(()=>{
            return ret;
        });
        return promiseChain;
    };
    
    exports.sendEmail = function(transportId, messageId, contextObj, recipients, attachments) {
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
            
            const passAlong = [];
            
            if(messageObj.recipients) {
                passAlong.push(db.EmailRecipientList.findOne({_id:messageObj.recipients._id}).exec());
            }
            else {
                passAlong.push(false);
            }
            
            if(messageObj.attachments) {
                passAlong.push(buildAttachmentsList(messageObj.attachments));
            }
            else {
                passAlong.push(false);
            }
            
            return Q.all(passAlong);
            
        })
        .then(function([recipientListObj, msgAttachmetList]) {
            if(!recipients && !(recipientListObj && recipientListObj.addresses && recipientListObj.addresses.length)) {
                throw deferred.reject('No recipients for message '+messageId);
            }
            
            recipients = recipients || [];
            if(recipientListObj && recipientListObj.addresses && recipientListObj.addresses.length) {
                recipients = recipients.concat(recipientListObj.addresses);
            }
            
            attachments = attachments || [];
            if(msgAttachmetList && msgAttachmetList.length) {
                attachments = attachments.concat(msgAttachmetList);
            }
            
            return [recipients, attachments];
        })
        .then(function([emailAddressArr, attachmentArr]) {
            console.log(emailAddressArr);
            if(!emailAddressArr || emailAddressArr.length === 0) {
                throw deferred.reject('No recipients found for message '+messageId);
            }
            
            var transporter = nodemailer.createTransport(transportObj.config);
            var mailObj = transportObj.options || {};
            mailObj.to = emailAddressArr.join();
            
            var textBody = messageObj.text_body || messageObj.body;
            var htmlBody = messageObj.html_body;
            
            if(contextObj) {
                var subjTemplate = handlebars.compile(messageObj.subject);
                var textTemplate = textBody && handlebars.compile(textBody);
                var htmlTemplate = htmlBody && handlebars.compile(htmlBody);
                mailObj.subject = subjTemplate(contextObj);
                
                if(textBody) {
                    mailObj.text = textTemplate(contextObj);
                }
                if(htmlBody) {
                    mailObj.html = htmlTemplate(contextObj);
                }
            }
            else{
                mailObj.subject = messageObj.subject;
                if(textBody) {
                    mailObj.text = textBody;
                }
                if(htmlBody) {
                    mailObj.html = htmlBody;
                }
            }
            
            if(attachmentArr && attachmentArr.length) {
                mailObj.attachments = attachmentArr;
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