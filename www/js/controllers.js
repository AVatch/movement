angular.module('movement.controllers', [])

.controller('RegisterCtrl', function($scope, $state, Accounts){
    $scope.user = {
        firstName: '',
        lastName: '',
        email: ''
    };
    $scope.register = function(){
        Accounts.register($scope.user);
    };
})

.controller('AuthenticateCtrl', function($scope, $state){
    
})

.controller('LogCtrl', function($scope, Utility){
    $scope.logs = Utility.retrieveLogEvents();
})

.controller('VenuesCtrl', function($scope, $ionicPopup, $ionicPlatform, uiGmapGoogleMapApi, Utility, GeoTracking) {
    
    var now = new Date();
    var msg = "[" + now.toString() + "]: Enetered the VenuesCtrl";
    Utility.logEvent(msg);
    
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


    // setup maps
    $scope.maps = [];
    var initMaps = function(){
        
        var now = new Date();
        var msg = "[" + now.toString() + "]: Initializing Maps";
        Utility.logEvent(msg);
        
        var coords = GeoTracking.getLoggedCoords();
        for(var i=0; i<Math.min(coords.length, 5); i++){
            $scope.maps.push({
                center: {
                    latitude: coords[Math.floor(Math.random() * coords.length)].latitude,
                    longitude: coords[Math.floor(Math.random() * coords.length)].longitude
                },
                zoom: 15,
                name: "Some Venue"
            })
        }
    }; initMaps();




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
    
    
    
    
    // initialize the background geo tracking
    $ionicPlatform.ready(function(){
        console.log("Platform is ready");
        var now = new Date();
        var msg = "[" + now.toString() + "]: IonicPlatform is ready";
        Utility.logEvent(msg);
       
        if(window.cordova && window.BackgroundGeolocation){
            console.log("Cordova and BackgroundGeolocation found");
            var now = new Date();
            var msg = "[" + now.toString() + "]: Cordova and BackgroundGeolocation found";
            Utility.logEvent(msg);
            
            // Get a reference to the plugin.
            var bgGeo = window.BackgroundGeolocation;
            
            var callbackFn = function(location, taskId) {
                var coords = location.coords;
                var lat    = coords.latitude;
                var lng    = coords.longitude;
                
                
                // log the events
                var now = new Date();
                var msg = "[" + now.toString() + "]:  BG Callback Success: " + JSON.stringify(location);
                Utility.logEvent(msg);
                
                // store the coords in cache
                GeoTracking.logCoord(coords);

                // Simulate doing some extra work with a bogus setTimeout.  This could perhaps be an Ajax request to your server.
                // The point here is that you must execute bgGeo.finish after all asynchronous operations within the callback are complete.
                setTimeout(function() {
                    bgGeo.finish(taskId); // <-- execute #finish when your work in callbackFn is complete
                }, 1000);
            };
            
            var failureFn = function(error) {
                console.log('BackgroundGeoLocation error');
                console.log( JSON.stringify(error) );
            };
            
            // BackgroundGeoLocation is highly configurable.
            bgGeo.configure(callbackFn, failureFn, {
                // Geolocation config
                desiredAccuracy: 0,
                stationaryRadius: 50,
                distanceFilter: 50,
                disableElasticity: false, // <-- [iOS] Default is 'false'.  Set true to disable speed-based distanceFilter elasticity
                locationUpdateInterval: 60000, // every minute
                minimumActivityRecognitionConfidence: 80,   // 0-100%.  Minimum activity-confidence for a state-change 
                fastestLocationUpdateInterval: 5000,
                activityRecognitionInterval: 10000,
                stopDetectionDelay: 1,  // Wait x minutes to engage stop-detection system
                stopTimeout: 2,  // Wait x miutes to turn off location system after stop-detection
                activityType: 'AutomotiveNavigation',

                // Application config
                debug: false, // <-- enable this hear sounds for background-geolocation life-cycle.
                forceReloadOnLocationChange: false,  // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when a new location is recorded (WARNING: possibly distruptive to user) 
                forceReloadOnMotionChange: false,    // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when device changes stationary-state (stationary->moving or vice-versa) --WARNING: possibly distruptive to user) 
                forceReloadOnGeofence: false,        // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when a geofence crossing occurs --WARNING: possibly distruptive to user) 
                stopOnTerminate: false,              // <-- [Android] Allow the background-service to run headless when user closes the app.
                startOnBoot: true,                   // <-- [Android] Auto start background-service in headless mode when device is powered-up.

                // // HTTP / SQLite config
                // url: 'http://posttestserver.com/post.php?dir=cordova-background-geolocation',
                // method: 'POST',
                // batchSync: true,       // <-- [Default: false] Set true to sync locations to server in a single HTTP request.
                // autoSync: true,         // <-- [Default: true] Set true to sync each location to server as it arrives.
                // maxDaysToPersist: 1,    // <-- Maximum days to persist a location in plugin's SQLite database when HTTP fails
                // headers: {
                //     "X-FOO": "bar"
                // },
                // params: {
                //     "auth_token": "maybe_your_server_authenticates_via_token_YES?"
                // }
            });

            // Turn ON the background-geolocation system.  The user will be tracked whenever they suspend the app.
            bgGeo.start();

            // If you wish to turn OFF background-tracking, call the #stop method.
            // bgGeo.stop()
            
            
        }
        
    });
    
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
