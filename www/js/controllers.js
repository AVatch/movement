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

.controller('AuthenticateCtrl', function($scope, $state, Accounts){
    
    $scope.slider;
    $scope.user = { username: '', password: '' };
    
    $scope.authenticate = function(){
          Accounts.authenticate($scope.user)
            .then(function(){
                $state.go('tab.venue');
            })
    };
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

.controller('VenuesCtrl', function($scope, $state, $ionicPopup, $ionicPlatform, 
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
    
    
    $scope.venues = [];
    Venues.loadVenues([1,2,3,4,5,6,7,8,9,10])
        .then(function(v){
            console.log("loaded");
            console.log(v);
            $scope.venues = v;
            
            initMap();
            
        }, function(e){
            console.log(e);
        });
    
    $scope.removeVenue = function( venue ){
      $scope.venues = $scope.venues.filter(function(obj){
         return venue.id != obj.id; 
      });
    };
    
    $scope.mapCtrl = {};
    $scope.mapObj = {center: {latitude: 51.219053, longitude: 4.404418 }, zoom: 14 };
    $scope.mapOptions = {scrollwheel: false};
    var initMap = function( ){
        console.log('initializing maps');
        uiGmapGoogleMapApi.then(function(maps) {
            console.log('here are the maps');
            console.log(maps)
        });
    };


    // refresh venue list
    $scope.doRefresh = function(){
        $timeout(function(){

        },1000).finally(function(){
            $scope.$broadcast('scroll.refreshComplete');
        })
    };


    $scope.showPopup = function( venue ){
        $ionicPopup.show({
            template: '<p>When you sign the guestbook, your signature will only be visible to other people who also signed. And then you can see who\'s worthy of talking to at CSCW... Ready to sign?</p>',
            title: 'Cool! Let\'s see who\'s been there?',
            scope: $scope,
            buttons: [
                { text: 'Not Now' },
                {
                    text: '<b>Sign</b>',
                    type: 'button-positive',
                    onTap: function(e) {
                        
                        // reveal userself to the server
                        
                        Venues.revealVisit(venue)
                            .then(function(){
                                // translate to the next state
                                $state.go('tab.venue-detail', { venueId: venue.foursquare_id } );        
                            }, function(){
                               Utility.raiseAlert('Sorry there was an issue'); 
                            });
                        return true;
                    }
                }
            ]
        });
    };
    
    
    // var showTrackingPermissionPopup = function(){
    //     return $ionicPopup.show({
    //         template: '<p>You will be asked to allow background tracking</p>',
    //         title: 'We are about to ask you for permissions',
    //         scope: $scope,
    //         buttons: [
    //             {
    //                 text: '<b>Ok</b>',
    //                 type: 'button-positive'
    //             }
    //         ]
    //     });
    // };
    // if(!GeoTracking.isTrackingEnabled()){
    //     showTrackingPermissionPopup()
    //         .then(function(){
    //             GeoTracking.startBGGeoTracking()
    //         });
    // }else{
    //     // PATCH JOB <-- Toggle the tracking when app starts
    //   GeoTracking.stopBGGeoTracking()
    //     .then(function(){
    //         GeoTracking.startBGGeoTracking()
    //     }, function(){ 
    //         // pass 
    //     })
  
    // }
    
})

.controller('VenuesDetailCtrl', function($scope, $stateParams, $timeout, Venues) {
    $scope.loading = true;
    $scope.venue = Venues.get( $stateParams.venueId );
    $scope.visitors = [];
    function getVisitors( ){
        $scope.visitors = [];
        Venues.getRevealedUsers( $stateParams.venueId )
            .then(function(r){
                $scope.visitors = r;
                $scope.$broadcast('scroll.refreshComplete');
                $scope.loading = false;
            }, function(e){
                $scope.$broadcast('scroll.refreshComplete');
             });
    } getVisitors();

    $scope.doRefresh = function(){
        getVisitors();
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
