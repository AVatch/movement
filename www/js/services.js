angular.module('movement.services', [])

.factory('MovementStore', function(store) {
  return store.getNamespacedStore('movement');
})

.factory('Utility', function($ionicPopup, MovementStore){
    function makeid(){
        var text = "";
        var MAX_SIZE = 500;
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i=0; i < MAX_SIZE; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    }
    
    return {
        getDeviceId: function(){
            // for now return random number
            // return Math.floor(Math.random()*500);
            // Cant believe i need to be doing this..
            return makeid()
        },
        raiseAlert: function(msg){
            var alertPopup = $ionicPopup.alert({
                title: 'Something went wrong!',
                template: msg
            });            
        },
        validateEmail: function(email){
            // REF: http://stackoverflow.com/questions/46155/validate-email-address-in-javascript
            var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
            return re.test(email);
        },
        logEvent: function(msg){
            var logs = MovementStore.get('logs');
            if(!logs){
                console.log("logs not found creating them");
                MovementStore.set('logs', []);
                logs = [];
            }
            logs.push(msg);
            MovementStore.set('logs', logs);
        },
        retrieveLogEvents: function(){
            var logs = MovementStore.get('logs');
            if(!logs){
                console.log("logs not found creating them");
                MovementStore.set('logs', []);
                logs = [];
            };
            return logs;
        }
    }
})

.factory('Accounts', function($q, $http, API_URL, Utility, MovementStore){
    
    
    return {
        register: function(user){
            var deferred = $q.defer();
            
            // do some basic validation, could defer to form validation if necessary
            if(user.firstName === '' && user.lastName === '' && user.email === ''){
                Utility.raiseAlert("Please enter all the information.")
                deferred.reject();    
            }else if( !Utility.validateEmail(user.email) ){
                Utility.raiseAlert("Please enter a valid email.")
                deferred.reject();
            }
            
            // turn the user obj to the format the server expects
            var newUser = {
                fullname: user.firstName + ' ' + user.lastName,
                emailId: user.email,
                deviceId: Utility.getDeviceId()
            };
            
            
            console.log(newUser);
            // passed validation, go ahead and register
            $http({
                url: API_URL + '/users/register/',
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                data: newUser 
            }).then(function(r){
                
                console.log(r);
                
                if(r.data.status === 'failed'){
                    Utility.raiseAlert("Sorry there was an error creating your account.")
                    deferred.reject();
                }else{
                    MovementStore.set('userObj', r.data);
                }
                
            }, function(e){
                console.log("There was an error");
                console.log(e);
            })
            
            return deferred.promise;
        }
    };

})


.factory('GeoTracking', function($q, $ionicPlatform, MovementStore, Utility){
    var bgGeo = null;
    
    function logCoords(coord){
        var coords = MovementStore.get('coords') || [];
        coords.push(coord);
        MovementStore.set('coords', coords);
    }
    
    function getBGGeoSettings(){
        return MovementStore.get('geoSettings') || {
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
            debug: false, // <-- enable this hear sounds for background-geolocation life-cycle. 
        };
    }
    
    function updateBGGeoSettings(settings){
        return MovementStore.set('geoSettings', settings);
    }
    
    function resetBGGeoSettings(){
        MovementStore.remove('geoSettings');
    }
    
    function initBGGeoTracking(){
        var deferred = $q.defer();
        
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
                bgGeo = window.BackgroundGeolocation;
                
                var callbackFn = function(location, taskId) {
                    var coords = location.coords;
                    var lat    = coords.latitude;
                    var lng    = coords.longitude;
                    
                    
                    // log the events
                    var now = new Date();
                    var msg = "[" + now.toString() + "]:  BG Callback Success: " + JSON.stringify(location);
                    Utility.logEvent(msg);
                    
                    // store the coords in cache
                    logCoords(coords);

                    // Simulate doing some extra work with a bogus setTimeout.  This could perhaps be an Ajax request to your server.
                    // The point here is that you must execute bgGeo.finish after all asynchronous operations within the callback are complete.
                    setTimeout(function() {
                        bgGeo.finish(taskId); // <-- execute #finish when your work in callbackFn is complete
                    }, 1000);
                };
                
                var failureFn = function(error) {
                    // log the events
                    var now = new Date();
                    var msg = "[" + now.toString() + "]:  BG Callback Error: " + JSON.stringify(error);
                    Utility.logEvent(msg);
                    deferred.reject();
                };
                
                // BackgroundGeoLocation is highly configurable.
                var geoSettings = getBGGeoSettings();
                
                bgGeo.configure(callbackFn, failureFn, {
                    // Geolocation config
                    desiredAccuracy: geoSettings.desiredAccuracy,
                    stationaryRadius: geoSettings.stationaryRadius,
                    distanceFilter: geoSettings.distanceFilter,
                    disableElasticity: geoSettings.disableElasticity,
                    locationUpdateInterval: geoSettings.locationUpdateInterval,
                    minimumActivityRecognitionConfidence: geoSettings.minimumActivityRecognitionConfidence, 
                    fastestLocationUpdateInterval: geoSettings.fastestLocationUpdateInterval,
                    activityRecognitionInterval: geoSettings.activityRecognitionInterval,
                    stopDetectionDelay: geoSettings.stopDetectionDelay,
                    stopTimeout: geoSettings.stopTimeout,
                    activityType: geoSettings.activityType,

                    // Application config
                    debug: geoSettings.debug, // <-- enable this hear sounds for background-geolocation life-cycle.
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
                // bgGeo.start();

                // If you wish to turn OFF background-tracking, call the #stop method.
                // bgGeo.stop()
                deferred.resolve();
            }
            
        });
        
        return deferred.promise;
    }
    
    
    
    return{
        getLoggedCoords: function(){
            return MovementStore.get('coords') || [];
        },
        startBGGeoTracking: function(){
            var deferred = $q.defer();
            
            initBGGeoTracking().then(function(){
                
                console.log('initing')
                console.log(JSON.stringify(bgGeo));
                
                bgGeo.start();
                
                console.log('inited')
                console.log(JSON.stringify(bgGeo));
                
                MovementStore.set('tracking', true);
                deferred.resolve();
            }, function(){
                deferred.reject();
            })
            
            return deferred.promise;
        },
        stopBGGeoTracking: function(){
            if(bgGeo){
                bgGeo.stop();
                MovementStore.set('tracking', false);
            }
        },
        isTrackingEnabled: function(){
            return MovementStore.get('tracking') || false;
        },
        getBGGeoSettings: getBGGeoSettings,
        updateBGGeoSettings: updateBGGeoSettings,
        resetBGGeoSettings: resetBGGeoSettings 
    };
})



.factory('Venues', function() {
  // Might use a resource here that returns a JSON array

  // Some fake testing data
  var chats = [{
    id: 0,
    name: 'Ben Sparrow',
    lastText: 'You on your way?',
    face: 'img/ben.png'
  }, {
    id: 1,
    name: 'Max Lynx',
    lastText: 'Hey, it\'s me',
    face: 'img/max.png'
  }, {
    id: 2,
    name: 'Adam Bradleyson',
    lastText: 'I should buy a boat',
    face: 'img/adam.jpg'
  }, {
    id: 3,
    name: 'Perry Governor',
    lastText: 'Look at my mukluks!',
    face: 'img/perry.png'
  }, {
    id: 4,
    name: 'Mike Harrington',
    lastText: 'This is wicked good ice cream.',
    face: 'img/mike.png'
  }];

  return {
    all: function() {
      return chats;
    },
    remove: function(chat) {
      chats.splice(chats.indexOf(chat), 1);
    },
    get: function(chatId) {
      for (var i = 0; i < chats.length; i++) {
        if (chats[i].id === parseInt(chatId)) {
          return chats[i];
        }
      }
      return null;
    }
  };
});
