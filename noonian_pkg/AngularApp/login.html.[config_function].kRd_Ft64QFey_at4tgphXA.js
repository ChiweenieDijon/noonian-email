function ($controllerProvider, $locationProvider) {
    
    $locationProvider.html5Mode(true);
    
    $controllerProvider.register('LoginController', function($scope, $http, $location, $window) {
        
        var urlBaseRegex = /^https?:\/\/[^\/]+(\/[^\/]+\/)login.html/;
        var match = urlBaseRegex.exec($location.absUrl());
        var urlBase = (match && match[1]) || '/';
        document.cookie = 'access_token=; expires='+(new Date(Date.now()-1000).toGMTString())+'; path='+urlBase;
        
        
        $scope.message = "Please enter username and password below";
        $scope.postData = {};
        
        var urlParams = $location.search();
        
        
        $scope.submit = function() {
            
            $http({
                method:'POST',
                url:'auth/login',
                data:$scope.postData
            }).then(
                //Success:
                function(resp) {
                    console.log('Login response: ', resp);
                    var redirectLink = (urlParams && urlParams.originalUrl) || '.';
                    $window.location.href = redirectLink;
                },
                //ERROR
                function(resp) {
                    console.log('ERROR', resp);
                    if(resp.data && resp.data.error === '$invalid_credentials') {
                        $scope.message = 'Invalid login credentials.  Please try again.';
                    }
                    else if(resp.data && resp.data.error === '$missing_phone') {
                        $scope.message = 'Two-factor authentication is required, but your user account is missing a phone number.  Please contact an administrator to resolve the issue.';
                    }
                    else if(resp.data && resp.data.twoFactorRequired) {
                        $scope.twoFactor = true;
                        $scope.message = 'Two-factor authentication required.  Please type in code sent to your phone.';
                    }
                    else {
                        $scope.message = (resp.data && resp.data.error) || resp.statusText
                    }
                }
            );
            
        }
    })
}