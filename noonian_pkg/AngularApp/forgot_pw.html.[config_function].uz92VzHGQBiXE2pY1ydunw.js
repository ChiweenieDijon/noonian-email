function ($controllerProvider, $locationProvider) {
    
    $locationProvider.html5Mode(true);
    
    $controllerProvider.register('ForgotController', function($scope, $http, $location) {
        
        var resetCode = $location.search().c;
        
        if(resetCode) {
            $http({
                method:'GET',
                url:'ws/sys/validatePasswordReset?code='+resetCode
            }).then(
                //Success:
                function(resp) {
                    console.log('WS response: ', resp);
                    if(resp.data) {
                        
                        if(resp.data.user) {
                            $scope.message = 'Please type in your new password below';
                            $scope.showResetForm = true;
                        }
                        if(resp.data.error === '$invalid-code') {
                            $scope.message = 'Code is either invalid or expired.  Please retry';
                            $scope.showUsername = true;
                        }
                    }
                    else {
                        $scope.message('An error occurred.');
                    }
                    
                },
                //ERROR
                function(resp) {
                    console.log('ERROR', resp);
                    if(resp.data && resp.data.error) {
                        $scope.message = resp.data.error;
                    }
                    else {
                        $scope.message = 'An error occurred.';   
                    }
                }
            );
        }
        else {
            $scope.message = "Please enter username below and click 'Submit' to reset your password.";
            $scope.showUsername = true;
            $scope.postData = {};
        }
        
        
        
        
        
        $scope.submitReq = function() {
            
            $http({
                method:'POST',
                url:'ws/sys/passwordReset',
                data:$scope.postData
            }).then(
                //Success:
                function(resp) {
                    console.log('WS response: ', resp);
                    if(resp.data && resp.data.message) {
                        $scope.message = resp.data.message;
                    }
                    if(resp.data && resp.data.error) {
                        $scope.message = resp.data.error;
                    }
                    
                },
                //ERROR
                function(resp) {
                    console.log('ERROR', resp);
                    if(resp.data && resp.data.error) {
                        $scope.message = resp.data.error;
                    }
                    else {
                        $scope.message = 'An error occurred.';
                    }
                }
            );
            
        };
        
        $scope.submitPw = function() {
        
            var paramObj = {code:resetCode, password:$scope.pw};
            $http.post('ws/sys/passwordReset', paramObj).then(
              function(resp) {
                var responseObj = resp.data;
                if(responseObj.error) {
                    if(responseObj.error == '$complexity_requirements') {
                        $scope.message = 'Password does not meet complexity requirements';
                        $scope.complexityRequirements = responseObj.requirements;
                    }
                    else if(responseObj.error == '$') {
                        $scope.message = '';
                    }
                  
                }
                else if(responseObj.result === 'success') {
                    $scope.message = 'Successfully changed password';
                    $scope.showResetForm = false;
                    $scope.showLoginLink = true;
                }
              },
              function(err) {
                var responseObj = err.data;
                if(responseObj) {
                   $scope.message = responseObj.error || err;
                };
              }
            );
        
        };
        
        
    })
}