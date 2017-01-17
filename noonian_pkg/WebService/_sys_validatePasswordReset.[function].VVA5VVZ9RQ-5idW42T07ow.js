function (db, _, nodeRequire, queryParams) {
    console.log('/sys/validatePasswordReset');
    var moment = nodeRequire('moment');
    
    return db.PasswordResetRequest.find({code:queryParams.code}).then(function(prrList) {
        
        var result = false;
        _.forEach(prrList, function(prr) {
            var reqDate = moment(prr.created_date);
            reqDate.add(1, 'day');
            if(reqDate.isAfter(moment())) {
                //Adding 1 day pushes it into future -> it was recent enough
                result = {
                    user:prr.user._id
                };
            }
            
        });
        
        if(!result) {
            result = {
                error:'$invalid-code'
            };
        }
        
        return result;
    });
}