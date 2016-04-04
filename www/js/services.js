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
        clearLogs: function( ){
            MovementStore.set('logs', []);
        },
        logEvent: function(msg){
            var now = new Date();
            var logs = MovementStore.get('logs') || [];
            logs.push( "[" + now.toString() + "]: " + msg);
            MovementStore.set('logs', logs);
        },
        retrieveLogEvents: function(){
            return MovementStore.get('logs') || [];
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
            // NOT IMPLEMENTED
            var deferred = $q.defer();
            return deferred.promise;
        }
    };

})

.factory('Notifications', function($q, $ionicPlatform, $cordovaLocalNotification, Utility){
    return {
        scheduleBGGeoReminderNotification: function( ){
            Utility.logEvent("Notifications.scheduleBGGeoReminderNotification() START");
            $ionicPlatform.ready(function(){
                // clear all the local notifications queued up
                if(window.cordova && window.cordova.plugins.notification){
                    $cordovaLocalNotification.clearAll()
                        .then(function( ){
                            Utility.logEvent("Cleared queued up notifications");
                            // schedule a notification a day from now
                            var notificationDate = new Date( moment().add(1, 'days') );
                            Utility.logEvent("Notification set for: ");
                            Utility.logEvent(notificationDate.toString());
                            $cordovaLocalNotification.schedule(
                                {
                                    id: 1,
                                    title: "Movement Tracking Stopped",
                                    text: "Tap to turn background tracking back on :)",
                                    at: notificationDate
                                }
                            ).then(function( ){
                                Utility.logEvent("Scheduled Notification");
                            })
                            .catch(function(e){
                                Utility.logEvent("Issue scheduling notification");
                                Utility.logEvent(JSON.stringify(e));
                            });
                            
                        })
                        .catch(function(e){
                            Utility.logEvent("Issue clearing notifications");
                            Utility.logEvent(JSON.stringify(e));
                        });
                }
                
            });
        }    
    };
})

.factory('GeoTracking', function($q, $ionicPlatform, MovementStore, Venues, Utility){
    var bgGeo = null;
    
    function distance(lat1, lon1, lat2, lon2, unit) {
        // Calculate the distance b/w two points
        // ref; https://www.geodatasource.com/developers/javascript
        
        lat1 = parseFloat(lat1);
        lon1 = parseFloat(lon1);
        lat2 = parseFloat(lat2);
        lon2 = parseFloat(lon2);
        
        var radlat1 = Math.PI * lat1/180
        var radlat2 = Math.PI * lat2/180
        var theta = lon1-lon2
        var radtheta = Math.PI * theta/180
        var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
        dist = Math.acos(dist)
        dist = dist * 180/Math.PI
        dist = dist * 60 * 1.1515
        if (unit=="K") { dist = dist * 1.609344 }
        if (unit=="N") { dist = dist * 0.8684 }
        return dist
    }
    
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
        Utility.logEvent("GeoTracking.updateBGGeoSettings() PASS");
        return MovementStore.set('geoSettings', settings);
    }
    
    function resetBGGeoSettings(){
        Utility.logEvent("GeoTracking.resetBGGeoSettings() PASS");
        return MovementStore.remove('geoSettings');
    }
    
    function initBGGeoTracking(){
        Utility.logEvent("GeoTracking.initBGGeoTracking() START");
        var deferred = $q.defer();
        // initialize the background geo tracking
        $ionicPlatform.ready(function(){
            if(window.cordova && window.BackgroundGeolocation){
                Utility.logEvent("GeoTracking.initBGGeoTracking() PLUGIN FOUND");
                // Get a reference to the plugin.
                bgGeo = window.BackgroundGeolocation;
                var callbackFn = function(location, taskId) {
                    Utility.logEvent("GeoTracking.GeoCallbackFN() START");
                    
                    
                    var coords = location.coords;
                    var lat    = coords.latitude;
                    var lng    = coords.longitude;
                    Utility.logEvent("GeoTracking.GeoCallbackFN() Coords: " + lat + ":" + lng);
                    
                    // var threshold = 20; // distance (meters) used to determine if user in same place 
                    // // See the previous coord. If none, get current coords and use that.
                    // var lastCoords = MovementStore.get('lastCoords') || { lat: lat, lng: lng };
                    // // Update the previous coord to teh current one
                    // MovementStore.set('lastCoords', { lat: lat, lng: lng });
                    // // calculate distance bw current coords and prev ones
                    // var dist = distance(lastCoords.lat, lastCoords.lng, lat, lng, 'K');
                    
                    // // if the app determines the user is stationary OR
                    // // if the use has moved within *threshold meters
                    // // we deem them to be at a venue and check them in.
                    // Utility.logEvent("GeoTracking.GeoCallbackFN() Distance from previous location: " + dist + "km");
                    
                    
                    if( !location.is_moving ){
                        Venues.logVenue( { lat: lat, lng: lng } )
                            .then(function(){
                                // pass
                            })
                            .catch(function(){
                                // pass
                            })
                            .finally(function(){
                                Utility.logEvent("GeoTracking.GeoCallbackFN() DONE");
                                bgGeo.finish(taskId);
                            });    
                    }else{
                        Utility.logEvent("User is moving, so we won't log this venue");
                        Utility.logEvent("GeoTracking.GeoCallbackFN() DONE");
                        
                        bgGeo.finish(taskId);
                    }
                    
                            
                    // if( !location.is_moving || dist / 1000.0 <= threshold ){
                    //     Venues.logVenue( { lat: lat, lng: lng } )
                    //         .then(function(){
                    //             bgGeo.finish(taskId);
                    //         });    
                    // }else{
                    //     // user has moved more than *threshold meters so they are not stationary
                    //     Utility.logEvent("GeoTracking.GeoCallbackFN()");
                    // }
                    
                };

                var failureFn = function(error) {
                    // log the events
                    Utility.logEvent("GeoTracking.GeoCallbackFN() Error");
                    Utility.logEvent( JSON.stringify(error) );
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
                    Utility.logEvent("GeoTracking.getCurrentCoords() Current Coords: " + s.coords.latitude + ":" + s.coords.longitude);;
                    deferred.resolve(s);
                }, function(e){
                    Utility.logEvent("GeoTracking.getCurrentCoords() FAIL");
                    Utility.logEvent(JSON.stringify(e));
                    deferred.reject(e);    
                });
            }
        });
        return deferred.promise;
    }

    return{
        startBGGeoTracking: function(){
            var deferred = $q.defer();
            Utility.logEvent("GeoTracking Starting");
            initBGGeoTracking().then(function(){
                bgGeo.start();
                MovementStore.set('tracking', true);
                Utility.logEvent("GeoTracking Started");
                deferred.resolve();
            }, function(){
                Utility.logEvent("GeoTracking Failed to start");
                deferred.reject();
            })
            return deferred.promise;
        },
        stopBGGeoTracking: function(){
            var deferred = $q.defer();
            Utility.logEvent("GeoTracking Stopping");
            $ionicPlatform.ready(function(){
               if(window.cordova && window.BackgroundGeolocation){ 
                    var bgGeo = window.BackgroundGeolocation;
                    bgGeo.stop();
                    MovementStore.set('tracking', false);
                    Utility.logEvent("GeoTracking Stopped");
                    deferred.resolve();
               }else{
                   Utility.logEvent("GeoTracking Failed to stop");
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
        Utility.logEvent("Venues.logVisit() for venueId: " + venueId);
        var deferred = $q.defer();   
        $http({
            url: API_URL + '/locations/' + venueId + '/visits',
            method: 'POST',
            headers: { Authorization: 'Token ' + Accounts.getToken() } 
        })
        .then(function(s){
            Utility.logEvent("Venue Visit Logged");
            deferred.resolve();
        }, function(e){
            Utility.logEvent("Venue Visit Failed to log");
            deferred.reject(e);    
        })
        return deferred.promise;
    }
    
    function logVenue( coords ){
        Utility.logEvent("Venues.logVenue() for coords: " + coords.lat + ":" + coords.lng);
        var deferred = $q.defer();
        $http({            
            url: API_URL + '/locations',
            method: 'POST',
            headers: { Authorization: 'Token ' + Accounts.getToken() },
            data: coords 
        })
        .then(function(s){
            Utility.logEvent("Venue Logged: " + s.data.id);
            var venues = getCachedVenues();
            if( venues.indexOf(s.data.id) === -1 ){
                Utility.logEvent("Venue is new");
                venues.push(s.data.id);
                logVisit(s.data.id); // increment the total visit count
                MovementStore.set('venues', venues);
            }
            deferred.resolve();
        }, function(e){
            Utility.logEvent("Venue Logged Failed");
            Utility.logEvent(JSON.stringify(e));
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
