angular.module('movement.controllers', [])

.controller('VenuesCtrl', function($scope, $ionicPopup, uiGmapGoogleMapApi) {
    $scope.loading = false;
    $scope.mapOptions = {
        disableDoubleClickZoom: true,
        draggable: false,
        scaleControl: false,
        zoomControl: false,
        streetViewControl: false,
        scrollwheel: false,
        rotateControl: false,
        panControl: false,
        overviewMapControl: false,
        mapTypeControl: false        
    };
    $scope.map = { center: { latitude: 45, longitude: -73 }, zoom: 8 };
    
    $scope.showPopup = function(){
        $ionicPopup.show({
            template: '<p>See visitors allows you to reveal your identity to other people who have also visited this venue. Your identity will only be visible to other people who choose to reveal their identity. Do you want to continue?</p>',
            title: 'Do you want to reveal your identity?',
            scope: $scope,
            buttons: [
                { text: 'Cancel' },
                {
                    text: '<b>Sign</b>',
                    type: 'button-positive',
                    onTap: function(e) {
                        if ( false ) {
                            //don't allow the user to close unless he enters wifi password
                            e.preventDefault();
                        } else {
                            return true;
                        }
                    }
                }
            ]
        });
    };
    
})

.controller('VenuesDetailCtrl', function($scope, $stateParams) {
    $scope.loading = true;
    $scope.venue = {
        title: "Some Place"
    };
})

.controller('ActivityCtrl', function($scope) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});
  
  $scope.loading = true;

})

.controller('SettingsCtrl', function($scope) {
  
})

.controller('AboutCtrl', function($scope) {
  
});
