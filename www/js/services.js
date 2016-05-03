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
            console.log(now.toLocaleString() + ': ' + msg);
            logs.push( "[" + now.toString() + "]: " + msg);
            MovementStore.set('logs', logs);
        },
        retrieveLogEvents: function(){
            return MovementStore.get('logs') || [];
        }
    }
})

.factory('Accounts', function($q, $http, API_URL, Utility, MovementStore){
    function getToken( ){
        return MovementStore.get('token');
    }
    function setDeviceToken( token ){
        return MovementStore.set('deviceToken', token);
    }
    function getDeviceToken( ){
        return MovementStore.get('deviceToken');
    }
    return {
        setDeviceToken: setDeviceToken,
        getDeviceToken: getDeviceToken,
        getToken: getToken,
        logout: function(){
            return MovementStore.set('authenticated', false);
        },
        isAuthenticated: function(){
            return MovementStore.get('authenticated') || false;
        },
        authenticate: function( credentials ){
            var deferred = $q.defer();
            
            credentials.username = credentials.username.toLowerCase(); 
            
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
        register: function( userInfo ){
            var deferred = $q.defer();
            
            userInfo.username = userInfo.username.toLowerCase();
            userInfo.device_token = getDeviceToken( ) || "";
            
            $http({
                url: API_URL + '/accounts',
                method: 'POST',
                data: userInfo
            })
            .then(function(r){
                deferred.resolve();
            }, function(e){
                console.log(e)
                deferred.reject(e);
            });

            return deferred.promise;
        },
        registerForPush: function( ){
            console.log('registering for push');
            if( getDeviceToken() ){
                $http({
                    url: API_URL + '/device',
                    method: 'POST',
                    headers: { Authorization: 'Token ' + getToken() },
                    data: {
                        "device_token":  getDeviceToken()
                    }
                }).then(function(r){
                    console.log('registered device token');
                    // console.log(JSON.stringify(r));
                }).catch(function(e){
                    console.log('failed to register device token')
                    console.log(JSON.stringify(e));
                });    
            }else{
                console.log('no device token');
            }
            
        },
        joinCohort: function( cohort ){
            var deferred = $q.defer();
            
            $http({
                url: API_URL + '/cohorts',
                method: 'POST',
                headers: { Authorization: 'Token ' + getToken() },
                data: {
                    name: cohort.toLowerCase()
                }
            })
            .then(function(r){
                deferred.resolve();
            }, function(e){
                deferred.reject(e);
            });

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
                                    title: "Movement misses you!",
                                    text: "See who’s signed the guestbook since you last checked.",
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
    var geotrackingService = undefined;
    
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
    
    
    return {
        isTrackingEnabled: function( ){
            // if( window.cordova && window.BackgroundGeolocation){
            //     window.BackgroundGeolocation.getState(function(state){
            //         console.log(JSON.stringify(state));
            //         return state.enabled;
            //     });
            // }else{
            //     return false;
            // }
            return MovementStore.get('tracking') || false;
            
        },
        getCoordinates: function(){
            var deferred = $q.defer();
            if( window.cordova && window.BackgroundGeolocation){
                geotrackingService = window.BackgroundGeolocation;
                
                geotrackingService.getCurrentPosition(function(location, taskId){
                    console.log('Got the location on motion change');
                    console.log(JSON.stringify(location));
                    
                    deferred.resolve(location);
                    geotrackingService.finish(taskId);
                    
                }, function(e){
                    console.log("error");
                    deferred.reject();
                });
                
            }else{
                console.log("no plugin");
                deferred.reject();     
            }
            
            return deferred.promise;
        },
        startTracking: function(){
            var deferred = $q.defer();
            
            if( window.cordova && window.BackgroundGeolocation){
                console.log("starting background tracking");
                geotrackingService = window.BackgroundGeolocation;
                
                
                var backgroundCallbackSuccessFn = function(location, taskId){
                      
                      console.log('bg success');
                      console.log(JSON.stringify(location));
                        
                      // signal task is done
                      geotrackingService.finish(taskId);
                };
                
                var backgroundCallbackFailureFn = function(error){
                    console.log("There was an error");
                };
                
                // listen to location events and errors
                geotrackingService.on('location', backgroundCallbackSuccessFn, backgroundCallbackFailureFn);
                
                // Fired whenever state changes from moving->stationary or vice-versa.
                geotrackingService.on('motionchange', function(isMoving) {
                    // ref: https://github.com/transistorsoft/cordova-background-geolocation/tree/master/docs#getcurrentpositionsuccessfn-failurefn-options

                    try {
                        window.BackgroundGeolocation.getCurrentPosition(function(location, taskId){
                            
                            
                            // try {
                            //     // for debug purposes
                            //     if(window.cordova && window.plugins.notification){
                            //         cordova.plugins.notification.local.schedule({
                            //             id: 100,
                            //             title: "onMotionChange",
                            //             text: "You changed! Logging with Server!",
                            //         });
                            //     }    
                            // } catch (error) {
                            //     console.log('failed to schedule notificiation');
                            // }
                            
                            
                            
                            Venues.logVenue( { lat: location.coords.latitude, lng: location.coords.longitude } )
                                .finally(function(){
                                    window.BackgroundGeolocation.finish(taskId);
                                });
                            
                        }, function(e){
                            console.log("error");
                        });
                           
                    } catch (error) {
                        console.log("there was an error");
                        console.log(JSON.stringify(error));
                    }
                    
                });
                
                geotrackingService.configure({
                    // Geolocation config
                    desiredAccuracy: 0,
                    distanceFilter: 10,
                    stationaryRadius: 50,
                    locationUpdateInterval: 1000,
                    fastestLocationUpdateInterval: 5000,
                    
                    // Activity Recognition config
                    activityType: 'Fitness', // http://stackoverflow.com/questions/32965705/difference-between-clactivitytype-values-ios-sdk
                    activityRecognitionInterval: 5000,
                    stopTimeout: 5,
                    
                    // Application config
                    debug: false,
                    stopOnTerminate: false,
                    startOnBoot: true
                }, function(state){
                    console.log("BackgroundGeolocation ready: ", state);
                    if( !state.enabled ){
                        MovementStore.set('tracking', true);
                        geotrackingService.start();
                    }
                    
                    deferred.resolve();
                    
                });

            }else{
                console.log("background tracking plugin missing");
                deferred.reject();
            }
            
            return deferred.promise;
        },
        stopTracking: function(){
            var deferred = $q.defer();
            
            if( window.cordova && window.BackgroundGeolocation){
                console.log("stopping background tracking");
                geotrackingService = window.BackgroundGeolocation;
                
                geotrackingService.stop();
                MovementStore.set('tracking', false);
                deferred.resolve();
                
            }else{
                console.log("background tracking plugin missing");
                deferred.reject();
            }
            
            return deferred.promise;
        },
        
        getCurrentCoords: function(){ 
            var deferred = $q.defer();
            
            if( window.cordova && window.BackgroundGeolocation){
            
                window.BackgroundGeolocation.getCurrentPosition(function(location, taskId){
                    deferred.resolve( { lat: location.coords.latitude, lng: location.coords.longitude } );
                    window.BackgroundGeolocation.finish(taskId);
                }, function(e){
                    console.log("error");
                    deferred.reject();
                });
    
            } else{
                console.log("plugin not installed");
                deferred.reject();
            }
            return deferred.promise;
            
        },
    }
    
    
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
