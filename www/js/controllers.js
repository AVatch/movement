angular.module('movement.controllers', [])

.controller('RegisterCtrl', function($scope, $state, Accounts){
    $scope.user = {
        firstName: '',
        lastName: '',
        email: ''
    };
    $scope.register = function(){
        Accounts.register($scope.user)
            .then(function(){
                $state.go('tab.venue');
            }, function(){ })
    };
})

.controller('AuthenticateCtrl', function($scope, $state){
    
})

.controller('LogCtrl', function($scope, Utility){
    $scope.$on('$ionicView.enter', function(e) {
        $scope.logs = Utility.retrieveLogEvents();
    });
    
    $scope.doRefresh = function(){
        $scope.logs = Utility.retrieveLogEvents();
        $scope.$broadcast('scroll.refreshComplete');
    };
})

.controller('VenuesCtrl', function($scope, $ionicPopup, $ionicPlatform, 
    $timeout, uiGmapGoogleMapApi, uiGmapIsReady, Venues, Utility, GeoTracking) {
    
    var now = new Date();
    var msg = "[" + now.toString() + "]: Enetered the VenuesCtrl";
    Utility.logEvent(msg);
    
    $scope.loading = true;
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
    $scope.markerOptions = {
        // icon: '/img/marker.png',
        // scale: 2
    };


    // setup maps
    $scope.maps = [];
    
    // dummy point for debuging
    // $scope.maps.push({
    //             center: {
    //                 latitude: 40.7238180,
    //                 longitude: -73.9786810
    //             },
    //             zoom: 15,
    //             name: "Some Venue"
    //         })
    
    var initMaps = function(){
        
        var now = new Date();
        var msg = "[" + now.toString() + "]: Initializing Maps";
        Utility.logEvent(msg);
        
        $scope.maps = [];
        var cachedVenues = Venues.all();
        // for now only show at most 25 venues in the array
        for(var i=0; i<Math.min(cachedVenues.length, 25); i++){
            
            
            $scope.maps.push({
                center: {
                    latitude: cachedVenues[i].lat, 
                    longitude: cachedVenues[i].lng
                },
                zoom: 15,
                name: cachedVenues[i].name,
                totalVisits: cachedVenues[i].totalVisits,
                totalReveals: cachedVenues[i].totalReveals
            })
        }
    }; initMaps();
    // Figure out when the maps are ready
    // uiGmapIsReady.promise(1).then(function(instances) {
    //     console.log('maps are loaded');
    //     $scope.loading = false;
    // });
    // patchjob for now
    $timeout(function(){
        $scope.loading = false;
    }, 5000);


    // refresh venue list
    $scope.doRefresh = function(){
        $timeout(function(){
            // pretend were requesting
            initMaps();
        },1000).finally(function(){
            $scope.$broadcast('scroll.refreshComplete');
        })
    };


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
    
    
    var showTrackingPermissionPopup = function(){
        return $ionicPopup.show({
            template: '<p>You will be asked to allow background tracking</p>',
            title: 'We are about to ask you for permissions',
            scope: $scope,
            buttons: [
                {
                    text: '<b>Ok</b>',
                    type: 'button-positive'
                }
            ]
        });
    };
    if(!GeoTracking.isTrackingEnabled()){
        showTrackingPermissionPopup()
            .then(function(){
                GeoTracking.startBGGeoTracking()
            });
    }
    
})

.controller('VenuesDetailCtrl', function($scope, $stateParams, $timeout) {
    $scope.loading = true;
    $scope.venue = {
        title: "Some Place"
    };
    $scope.visitors = [{
        name: "adrian vatchinsky"
    },
    {
        name: "biggie smalls"
    }];
    
    // pretend were http-ing
    $timeout(function(){
        $scope.loading = false;
    }, 1000);
    
    // refresh visitor
    $scope.doRefresh = function(){
        $timeout(function(){
            // pretend were requesting
        },1000).finally(function(){
            $scope.$broadcast('scroll.refreshComplete');
        })
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

.controller('SettingsCtrl', function($scope, $state, $ionicPopup, GeoTracking, Accounts) {
    $scope.geoSettings = GeoTracking.getBGGeoSettings();
    $scope.trackingEnabled = GeoTracking.isTrackingEnabled();
    
    $scope.toggleTracking = function(){
        
        if($scope.trackingEnabled){
            // stop
            console.log("Stopping traccking");
            GeoTracking.stopBGGeoTracking()
                .then(function(){
                    $ionicPopup.alert({
                        title: 'Success',
                        template: 'Background tracking stopped'
                    });
                    $scope.trackingEnabled = GeoTracking.isTrackingEnabled();
                });
        }else{
            // start
            console.log("Starting traccking");
            GeoTracking.startBGGeoTracking()
                .then(function(){
                    $ionicPopup.alert({
                        title: 'Success',
                        template: 'Background tracking started'
                    });
                    $scope.trackingEnabled = GeoTracking.isTrackingEnabled();
                });
            
        }
        
    };
    
    $scope.updateBGGeoSettings = function(){
        GeoTracking.updateBGGeoSettings($scope.geoSettings);
        $scope.geoSettings = GeoTracking.getBGGeoSettings();
        $ionicPopup.alert({
            title: 'Success',
            template: 'Configuration was updated'
        });
    };
    $scope.resetBGGeoSettings = function(){
        GeoTracking.resetBGGeoSettings();
        $scope.geoSettings = GeoTracking.getBGGeoSettings();
        $ionicPopup.alert({
            title: 'Success',
            template: 'Configuration was reset'
        });
    };
    
    $scope.logout = function(){
        Accounts.logout();
        $state.go('register');
    }
})

.controller('AboutCtrl', function($scope) {});
