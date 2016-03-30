angular.module('movement.services', [])

.factory('MovementStore', function(store) {
  return store.getNamespacedStore('movement');
})

.factory('Utility', function($ionicPopup, $ionicPlatform, MovementStore){
    function makeid(){
        var text = "";
        var MAX_SIZE = 500;
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for( var i=0; i < MAX_SIZE; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        
        MovementStore.set('deviceId', text);
        
        return text;
    }
    
    function compare(a,b) {
        if (a.totalVisits > b.totalVisits){
            return -1;
        }
        else if (a.totalVisits < b.totalVisits){
            return 1;
        }
        else{ 
            return 0;
        }
    }
    
    return {
        compare: compare,
        getDeviceId: function(){
            return MovementStore.get('deviceId') || makeid();
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
        getToken: function( ){
            return MovementStore.get('token');
        },
        logout: function(){
            return MovementStore.set('authenticated', false);
        },
        isAuthenticated: function(){
            return MovementStore.get('authenticated') || false;
        },
        authenticate: function( credentials ){
            var deferred = $q.defer();
            
            $http({
                url: API_URL + '/api-token-auth',
                method: 'POST',
                data: credentials
            })
            .then(function(r){
                MovementStore.set('token', r.data.token )
                MovementStore.set('authenticated', true )
                deferred.resolve();
            }, function(e){
                deferred.reject(e);
            });

            return deferred.promise;
        },
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
                headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                transformRequest: function(obj) {
                    var str = [];
                    for(var p in obj)
                    str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
                    return str.join("&");
                },
                data: newUser 
            }).then(function(r){
                console.log(r);
                var now = new Date();
                var msg = "[" + now.toString() + "]:  Registering User " + JSON.stringify(r);
               
                if(r.data.status == 'success'){
                    console.log('hi');
                    MovementStore.set('authenticated', true);
                    var now = new Date();
                    var msg = "[" + now.toString() + "]:  Registered User";
                    Utility.logEvent(msg);
                    deferred.resolve();
                }else{
                    var now = new Date();
                    var msg = "[" + now.toString() + "]:  Failed registering the user";
                    Utility.logEvent(msg);
                    Utility.raiseAlert("Sorry there was an error creating your account.")
                    deferred.reject();
                }
                
            }, function(e){
                console.log("There was an error");
                console.log(e);
            })
            
            return deferred.promise;
        }
    };

})

.factory('GeoTracking', function($q, $ionicPlatform, MovementStore, Venues, Utility){
    var bgGeo = null;
    
    function getBGGeoSettings(){
        // see the link below for a list of option definitions
        // https://github.com/transistorsoft/cordova-background-geolocation/blob/master/docs/api.md#geolocation-options        
        return MovementStore.get('geoSettings') || {
            desiredAccuracy: 0,
            distanceFilter: 10,
            stationaryRadius: 10,
            disableElasticity: false, // <-- [iOS] Default is 'false'.  Set true to disable speed-based distanceFilter elasticity
            
            activityRecognitionInterval: 10000,
            stopTimeout: 2,  // rdm - Wait x miutes to turn off location system after stop-detection
            minimumActivityRecognitionConfidence: 40,   // Minimum activity-confidence for a state-change
             
            locationUpdateInterval: 5000, // every second
            
            fastestLocationUpdateInterval: 5000,
            stopDetectionDelay: 1,  // Wait x minutes to engage stop-detection system
            
            activityType: 'Fitness', // http://stackoverflow.com/questions/32965705/difference-between-clactivitytype-values-ios-sdk
            debug: true, // <-- enable this hear sounds for background-geolocation life-cycle. 
        };
    }
    
    function updateBGGeoSettings(settings){
        var now = new Date();
        var msg = "[" + now.toString() + "]:  Updating the BG Geo Configuration";
        Utility.logEvent(msg);
        
        return MovementStore.set('geoSettings', settings);
    }
    
    function resetBGGeoSettings(){
        var now = new Date();
        var msg = "[" + now.toString() + "]:  Resetting the BG Geo Configuration";
        Utility.logEvent(msg);
        
        return MovementStore.remove('geoSettings');
    }
    
    function initBGGeoTracking(){
        var deferred = $q.defer();
        
        // initialize the background geo tracking
        $ionicPlatform.ready(function(){        
            if(window.cordova && window.BackgroundGeolocation){
                console.log("Cordova and BackgroundGeolocation found");
                var now = new Date();
                var msg = "[" + now.toString() + "]: Cordova and BackgroundGeolocation found";
                Utility.logEvent(msg);
                
                // Get a reference to the plugin.
                bgGeo = window.BackgroundGeolocation;
                
                var callbackFn = function(location, taskId) {
                    var now = new Date();
                    var msg = "[" + now.toString() + "]: GeoCallbackFn: " + JSON.stringify(location);
                    Utility.logEvent(msg);
                    
                    var coords = location.coords;
                    var lat    = coords.latitude;
                    var lng    = coords.longitude;

                    var now = new Date();
                    var msg = "[" + now.toString() + "]: is_moving: " + location.is_moving;
                    Utility.logEvent(msg);

                    if(!location.is_moving){    
                        // Translate the coords to some venue
                        Venues.logVenue( { lat: lat, lng: lng } )
                            .then(function(){
                                var now = new Date();
                                var msg = "[" + now.toString() + "]: GeoCallbackFn Done";
                                Utility.logEvent(msg);
                                bgGeo.finish(taskId);
                            });
                    }
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
                    debug: geoSettings.debug,            // <-- enable this hear sounds for background-geolocation life-cycle.
                    forceReloadOnLocationChange: false,  // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when a new location is recorded (WARNING: possibly distruptive to user) 
                    forceReloadOnMotionChange: false,    // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when device changes stationary-state (stationary->moving or vice-versa) --WARNING: possibly distruptive to user) 
                    forceReloadOnGeofence: false,        // <-- [Android] If the user closes the app **while location-tracking is started** , reboot app when a geofence crossing occurs --WARNING: possibly distruptive to user) 
                    stopOnTerminate: false,              // <-- [Android] Allow the background-service to run headless when user closes the app.
                    startOnBoot: true,                   // <-- [Android] Auto start background-service in headless mode when device is powered-up.
                });
                deferred.resolve();
            }
        });
        return deferred.promise;
    }



    function getCurrentCoords(){
        var deferred = $q.defer();
        $ionicPlatform.ready(function(){
            if(window.cordova && window.BackgroundGeolocation){ 
                window.BackgroundGeolocation.getCurrentPosition(function(s){
                    var now = new Date();
                    var msg = "[" + now.toString() + "]:  Passed getCurrentCoords(): " + JSON.stringify(s);
                    Utility.logEvent(msg);
                    deferred.resolve(s);
                }, function(e){
                    var now = new Date();
                    var msg = "[" + now.toString() + "]:  Failed getCurrentCoords()";
                    Utility.logEvent(msg);
                    deferred.reject(e);    
                });
            }
        });
        return deferred.promise;
    }
    
    
    
    return{
        startBGGeoTracking: function(){
            var deferred = $q.defer();
            
            var now = new Date();
            var msg = "[" + now.toString() + "]:  Starting BG Geo Tracking Service";
            Utility.logEvent(msg);
            
            initBGGeoTracking().then(function(){
                bgGeo.start();

                MovementStore.set('tracking', true);
                
                var now = new Date();
                var msg = "[" + now.toString() + "]:  Started BG Geo Tracking Service";
                Utility.logEvent(msg);
                
                deferred.resolve();
            }, function(){
                deferred.reject();
            })
            
            return deferred.promise;
        },
        stopBGGeoTracking: function(){
            var deferred = $q.defer();
            
            var now = new Date();
            var msg = "[" + now.toString() + "]:  Stopping BG Geo Tracking Service";
            Utility.logEvent(msg);

            $ionicPlatform.ready(function(){
               if(window.cordova && window.BackgroundGeolocation){ 
                    var bgGeo = window.BackgroundGeolocation;

                    bgGeo.stop();
                    MovementStore.set('tracking', false);
                    
                    var now = new Date();
                    var msg = "[" + now.toString() + "]:  Stopped BG Geo Tracking Service";
                    Utility.logEvent(msg);
                    
                    deferred.resolve();
                           
               }else{
                   deferred.reject();
               } 
            });
            
            
            return deferred.promise;
        },
        isTrackingEnabled: function(){
            return MovementStore.get('tracking') || false;
        },
        getCurrentCoords: getCurrentCoords,
        getBGGeoSettings: getBGGeoSettings,
        updateBGGeoSettings: updateBGGeoSettings,
        resetBGGeoSettings: resetBGGeoSettings 
    };
})

.factory('Venues', function($q, $http, MovementStore, Utility, Accounts, API_URL) {
           
    function getCachedVenues(){
        return MovementStore.get('venues') || [];
    }
    
    function logVisit( venueId ){
        var deferred = $q.defer();   
        $http({
            url: API_URL + '/locations/' + venueId + '/visits',
            method: 'POST',
            headers: { Authorization: 'Token ' + Accounts.getToken() } 
        })
        .then(function(s){
            deferred.resolve();
        }, function(e){
            deferred.reject(e);    
        })
        return deferred.promise;
    }
    
    function logVenue( coords ){
        var deferred = $q.defer();
        
        var now = new Date();
        var msg = "[" + now.toString() + "]: Venues.logVenue()";
        Utility.logEvent(msg);
        
        $http({            
            url: API_URL + '/locations',
            method: 'POST',
            headers: { Authorization: 'Token ' + Accounts.getToken() },
            data: coords 
        })
        .then(function(s){
            
            var now = new Date();
            var msg = "[" + now.toString() + "]: Venues.logVenue() Success";
            Utility.logEvent(msg);            

            var venues = getCachedVenues();
            if( venues.indexOf(s.data.id) === -1 ){
                
                var now = new Date();
                var msg = "[" + now.toString() + "]: New venue found";
                Utility.logEvent(msg);
                
                venues.push(s.data.id);
                logVisit(s.data.id); // increment the total visit count
                MovementStore.set('venues', venues);
            }
            deferred.resolve();
        }, function(e){
            
            var now = new Date();
            var msg = "[" + now.toString() + "]: Venues.logVenue() Failed";
            Utility.logEvent(msg);            
            
            deferred.reject(e);
        })
        
        return deferred.promise;
    }
    
    function loadVenues( locationIds ){
        var deferred = $q.defer();
        if( locationIds.length > 0 ){
            console.log("get it get it")
            $http({            
                url: API_URL + '/locations',
                method: 'GET',
                headers: { Authorization: 'Token ' + Accounts.getToken() },
                params:{ ids: locationIds.join() } 
            })
            .then(function(s){
                console.log("Got everything")
                deferred.resolve(s.data);
            }, function(e){
                console.log("failed")
                deferred.reject(e);
            })    
        }else{ deferred.reject('Nothing cached'); }
        
        
        return deferred.promise;
    }
    
    function wasntThere( locationId ){
        var deferred = $q.defer();
        if( locationId ){
            $http({            
                url: API_URL + '/locations',
                method: 'PUT',
                headers: { Authorization: 'Token ' + Accounts.getToken() },
                data:{ id: locationId } 
            })
            .then(function(s){
                deferred.resolve(s.data);
            }, function(e){
                deferred.reject(e);
            })    
        }else{ deferred.reject(); }
        
        
        return deferred.promise;
    }
    
    function retrieveVenues( ){
        console.log("retrieve venues");
        var deferred = $q.defer();
        loadVenues( getCachedVenues( ) )
            .then(function(s){
                deferred.resolve(s);
            }, function(e){
                deferred.reject(e);
            });
       return deferred.promise;
    }
    
    function removeVenue( venueId ){
        
        wasntThere(venueId);
        
        var venues = getCachedVenues();
        venues.splice( venues.indexOf(venueId), 1)
        MovementStore.set('venues', venues);
    }
    
    function revealVenue( venue ){
        
        var deferred = $q.defer();
        
        $http({            
            url: API_URL + '/locations/' + venue.id + '/reveal',
            method: 'POST',
            headers: { Authorization: 'Token ' + Accounts.getToken() } 
        })
        .then(function(s){
            var revealedVenues = MovementStore.get('revealed') || [];
            revealedVenues.push(venue.id);
            MovementStore.set('revealed', revealedVenues);
            deferred.resolve(s.data);
        }, function(e){
            console.log(e);
            deferred.reject(e);
        });
        return deferred.promise;
        
    }
    
    function getRevealedVenueDetails( venue ){
        
        var deferred = $q.defer();
        
        $http({            
            url: API_URL + '/locations/' + venue.id + '/reveal',
            method: 'GET',
            headers: { Authorization: 'Token ' + Accounts.getToken() } 
        })
        .then(function(s){
            deferred.resolve(s.data);
        }, function(e){
            console.log(e);
            deferred.reject(e);
        })    

        return deferred.promise;
        
    }
    
    function getMyReveals( ){
        return MovementStore.get('revealed') || [];
    }
    
    return {
        loadVenues: loadVenues,
        logVenue: logVenue,
        all: retrieveVenues,
        removeVenue: removeVenue,
        revealVenue: revealVenue,
        getRevealedVenueDetails: getRevealedVenueDetails,
        getMyReveals: getMyReveals
    };
})

.factory('Activity', function($q, MovementStore, Utility){
  
  var activities = MovementStore.get('activities') || [];

  return {
    all: function() {
      return activities;
    },
    remove: function(activity) {
      activities.splice(activities.indexOf(activity), 1);
    },
    add: function(activity) {
      activities.push(activity);
      MovementStore.set('activities', activities);
    },
    get: function(activityId) {
      for (var i = 0; i < activities.length; i++) {
        if (activities[i].id === parseInt(activityId)) {
          return activities[i];
        }
      }
      return null;
    }
  };
});
