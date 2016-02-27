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

    // setup maps
    $scope.maps = [];
    var initMaps = function(){
        
        var now = new Date();
        var msg = "[" + now.toString() + "]: Initializing Maps";
        Utility.logEvent(msg);
        
        $scope.maps = []; // clear maps for now
        var cachedVenues = Venues.all();
        
        // first sort by tallycount
        //cachedVenues = cachedVenues.sort(Utility.compare);
        cachedVenues.reverse();
        
        // for now only show at most 25 venues in the array
        var max = 15;
        var showMap = true;
        for(var i=0; i< cachedVenues.length; i++){
            if(i > max) 
            {
              //quick hack to solve the map loading issue. For
              //more than 20 venues, we just show an empty div instead of a
              //map. hopefully people will just think it's taking a while to load
              //or something...
              showMap = false;
            }
            $scope.maps.push({
              center: {
                  latitude: cachedVenues[i].lat, 
                  longitude: cachedVenues[i].lng
              },
              zoom: 15,
              signed: cachedVenues[i].signed,
              foursquare_id: cachedVenues[i].foursquare_id,
              name: cachedVenues[i].name,
              totalVisits: cachedVenues[i].totalVisits,
              totalReveals: cachedVenues[i].totalReveals,
              show:showMap
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
    }else{
        // PATCH JOB <-- Toggle the tracking when app starts
  
      GeoTracking.stopBGGeoTracking()
        .then(function(){
            GeoTracking.startBGGeoTracking()
        }, function(){ 
            // pass 
        })
  
    }
    
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
