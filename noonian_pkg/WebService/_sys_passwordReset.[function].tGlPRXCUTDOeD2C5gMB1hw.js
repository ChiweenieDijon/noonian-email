function (db, postBody, config, _, nodeRequire) {
    console.log('/sys/passwordReset %j', postBody);
    
    if(!postBody.username && !postBody.code) {
        throw 'Missing required parameter';
    }
    
    if(postBody.code) {
        //Submitting the actual new password
        var moment = nodeRequire('moment');
    
        return db.PasswordResetRequest.find({code:postBody.code}).then(function(prrList) {
            
            var matchingPrr;
            
            _.forEach(prrList, function(prr) {
                var reqDate = moment(prr.created_date);
                reqDate.add(1, 'day');
                if(reqDate.isAfter(moment())) {
                    //Adding 1 day pushes it into future -> it was recent enough
                    matchingPrr = prr;
                }
                else {
                    prr.remove();
                }
            });
            
            if(!matchingPrr) {
                return { error:'$invalid-code' };
            }
            
            var user = matchingPrr.user;
            var newPassword = postBody.password;
            
            return config.getParameter('sys.password_complexity', false).then(function(complexityDesc) {
                  if(complexityDesc) {
                    var checkerRegex = new RegExp(complexityDesc.regex);
                    if(!checkerRegex.test(newPassword)) {
                      return {error:'$complexity_requirements', requirements:complexityDesc.description};
                    }
                  }
                  
                  return db.User.findOne({_id:user._id}).then(function(userObj) {
                      userObj.password = newPassword;
                      return userObj.save().then(function() {
                          matchingPrr.remove();
                          return {result:'success'};
                        }
                      );
                  });
            });
            
        });
    }
    else {
        
        var theUser;
        
        return db.User.findOne({name:postBody.username}).then(function(u) {
            if(!u) {
                throw 'User '+postBody.username+' not found.';
            }
            theUser = u;
            //Map user to email address via config sys.email.userToEmail
            return config.getParameter('sys.email.passwordReset', false);
            
        })
        .then(function(pwResetConfig) {
            if(!pwResetConfig) {
                throw new Error('PW Reset not configured properly (missing config item sys.email.passwordReset)');
            }
            var emailMapping = pwResetConfig.userToEmail || 'name';
            //emailMapping tells us where to find the email address for a user, e.g.
            
            if(typeof emailMapping === 'string') {
                //emailMapping is a string -> addy is a field on the User itself
                return theUser[emailMapping];
            }
            else {
                //emailMapping is object -> addy is a field somewhere else
                // refClass.refField points to this user, and refClass.emailField has the address.
                var refClass = emailMapping.refClass;
                var refField = emailMapping.refField;
                var emailField = emailMapping.emailField;
                
                var queryObj = {};
                queryObj[refField] = theUser._id;
                
                return db[refClass].find(queryObj).then(function(result) {
                    for(var i=0; i < result.length; i++) {
                        var email = _.get(result[i], emailField);
                        if(email) {
                            return email;
                        }
                    }
                    return false;
                });
            }
        })
        .then(function(userEmail) {
            if(!userEmail) {
                throw 'No email found for '+postBody.username;
            }
            
            var prrObj = new db.PasswordResetRequest({
                user:theUser,
                email:userEmail
            });
            
            return prrObj.save().then(function(){
                return {
                    message:'Submitted.  Check your email and follow the instructions',
                    result:'success'
                }
            });
            
            
        })
        ;
    }
    
}