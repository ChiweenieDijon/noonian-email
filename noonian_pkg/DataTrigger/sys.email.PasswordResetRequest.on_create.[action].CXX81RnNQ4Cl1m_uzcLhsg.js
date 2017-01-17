function (EmailService, config, db, Q) {
    var targetObj = this;
    // var jwt = nodeRequire('jsonwebtoken');
    
    targetObj.code = db.generateId(); //jwt.sign({id:targetObj.user._id}, 'CXX81RnNQ4Cl1m_uzcLhsg');
    //Generate a code, send the email
    
    return Q.all([
        config.getParameter('sys.email.passwordReset', false),
        config.getParameter('sys.serverUrl', false)
    ]).then(function(resultArr) {
        var resetConfig = resultArr[0];
        var serverUrl = resultArr[1];
        
        var transportId = resetConfig.transport;
        var messageId = resetConfig.message;
        var emailAddress = targetObj.email;
        
        if(!transportId || !messageId) {
            throw new Error('invalid sys.email.passwordReset config; missing transport and/or message ids');
        }
        
        var resetLink = serverUrl+'/forgot_pw.html?c='+targetObj.code;
        var subject = resetConfig.subject_line || 'Password Reset Request';
        EmailService.sendEmail(transportId, messageId, {reset_link:resetLink, user:targetObj.user, subject_line:subject}, [emailAddress]).then(function(result) {
            console.log('pw reset email result: %j', result);
        }, 
        function(err) {
            console.log('error sending pw reset email: %j', err);
        });
    });
}