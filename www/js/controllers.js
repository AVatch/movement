angular.module('movement.controllers', [])

.controller('VenuesCtrl', function($scope) {
    $scope.loading = false;
    
    $scope.map = { center: { latitude: 45, longitude: -73 }, zoom: 8 };
    
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
