angular.module('movement.controllers', [])

.controller('RegisterCtrl', function($scope, $state, $ionicAnalytics,$ionicLoading, Accounts){
    $scope.user = {
        username: '',
        email: '',
        password: ''
    };
    $scope.register = function(){
        showLoading();
        Accounts.register($scope.user)
            .then(function(){
                
                Accounts.authenticate({
                    username: $scope.user.username,
                    password: $scope.user.password 
                }).then(function(){
                    
                    var now = new Date();
                    $ionicAnalytics.track('Account Creation Success', {
                        item: {
                            time_stamp: now.toUTCString()
                        },
                    });
                    doneLoading();
                    $state.go('join');
                    
                    
                }).catch(function( ){
                    doneLoading();
                    alert("There was an issue signing in, please try again.");
                    
                     
                });
                
            }).catch(function(){
                doneLoading();
                alert("There was an issue creating your account, please try again.");
                
                var now = new Date();
                $ionicAnalytics.track('Account Creation Fail', {
                    item: {
                        time_stamp: now.toUTCString()
                    },
                });
            })
    };
    
    function showLoading(){
        $ionicLoading.show({
            template: 'One moment please...'
        });    
    }
    function doneLoading(){
        $ionicLoading.hide();
    }
})

.controller('AuthenticateCtrl', function($scope, $state, $ionicAnalytics, $ionicLoading, Accounts){
    
    $scope.slider;
    $scope.user = { username: '', password: '' };
    
    $scope.authenticate = function(){
        showLoading();
          Accounts.authenticate($scope.user)
            .then(function(){
                var now = new Date();
                $ionicAnalytics.track('Account Authentication Success', {
                    item: {
                        time_stamp: now.toUTCString()
                    },
                });
                doneLoading();
                $state.go('tab.venue');
            })
            .catch(function(){
                doneLoading();
                alert('There was an issue signing you in, please try again.')
                
                var now = new Date();
                $ionicAnalytics.track('Account Authentication Fail', {
                    item: {
                        time_stamp: now.toUTCString()
                    },
                });
            })
    };
    
    function showLoading(){
        $ionicLoading.show({
            template: 'One moment please...'
        });    
    }
    function doneLoading(){
        $ionicLoading.hide();
    }
})

.controller('JoinCtrl', function($scope, $state, $ionicAnalytics, $ionicLoading, Accounts){
    $scope.cohort = {
        name: '#'
    };
    $scope.join = function(){
        showLoading();
        Accounts.joinCohort( $scope.cohort.name.replace('#', '').trim() )
            .then(function(){
                
                var now = new Date();
                $ionicAnalytics.track('Cohort Join Success', {
                    item: {
                        cohort: $scope.cohort.name.replace('#', '').trim(),
                        time_stamp: now.toUTCString()
                    },
                });
                doneLoading();
                $state.go('tab.venue');
            })
            .catch(function(){
                doneLoading();
                alert('Sorry, that cohort is not valid');
            });
    };
    
    function showLoading(){
        $ionicLoading.show({
            template: 'One moment please...'
        });    
    }
    function doneLoading(){
        $ionicLoading.hide();
    }
})

.controller('LogCtrl', function($scope, Utility){
    $scope.$on('$ionicView.enter', function(e) {
        $scope.logs = Utility.retrieveLogEvents();
    });
    
    $scope.clearLogs = function( ){
        Utility.clearLogs();
        $scope.logs = [];
    };
    
    $scope.doRefresh = function(){
        $scope.logs = Utility.retrieveLogEvents();
        $scope.$broadcast('scroll.refreshComplete');
    };
})

.controller('VenuesCtrl', function($scope, $state, $ionicPopup, $ionicPlatform, $ionicAnalytics,
    $ionicScrollDelegate, uiGmapGoogleMapApi, Accounts, Venues, Utility, GeoTracking, Notifications) {
        
    var now = new Date();
    $ionicAnalytics.track('Application opened', {
        item: {
            time_stamp: now.toUTCString()
        },
    });
           
    // $scope.mapCtrl = {loaded: false};
    
    // $scope.meMarker = { center: {latitude: 40.740883, longitude: -74.002228 }, options: { icon:'img/here.png' }, id:0 };
    // ref: https://snazzymaps.com/style/25/blue-water
    var mapStyle = [{"featureType":"administrative","elementType":"labels.text.fill","stylers":[{"color":"#444444"}]},{"featureType":"landscape","elementType":"all","stylers":[{"color":"#f2f2f2"}]},{"featureType":"poi","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"road","elementType":"all","stylers":[{"saturation":-100},{"lightness":45}]},{"featureType":"road.highway","elementType":"all","stylers":[{"visibility":"simplified"}]},{"featureType":"road.arterial","elementType":"labels.icon","stylers":[{"visibility":"off"}]},{"featureType":"transit","elementType":"all","stylers":[{"visibility":"off"}]},{"featureType":"water","elementType":"all","stylers":[{"color":"#46bcec"},{"visibility":"on"}]}]
    $scope.map = {
      center: { latitude: 40.740883, longitude: -74.002228 },
      zoom: 13,
      control: {}  
    };
    $scope.mapOptions = {
      styles: mapStyle,
      disableDefaultUI: true
    };
    $scope.markers = {
        events: {
            click: function( marker, eventName, args ){
                console.log('click')
                console.log(marker)
                console.log(eventName)
                console.log(args)
            }
        }
    }

    
    function scheduleReminder( ){
        Notifications.scheduleBGGeoReminderNotification( );
    }
    
    
    
    $scope.venues = [];
    var loadVenues = function(){
        $scope.venuesLoading = true;
        Venues.all()
            .then(function(v){
                $scope.venuesLoading = false;

                $scope.venues = v.map(function(loc){
                   loc.coords = {}
                   loc.coords.latitude = loc.lat / 10000.;
                   loc.coords.longitude = loc.lng / 10000.;
                   
                   loc.events = {
                       click: function( marker, eventName, args ) {
                           console.log('clicked marker')
                           console.log(marker)
                           console.log(eventName)
                           console.log(args)
                       }
                   }
                   return loc; 
                });
                
                // var ignoreList = [
                //     'Cities',
                //     'Counties',
                //     'Countries',
                //     'Neighborhoods',
                //     'States',
                //     'Towns',
                //     'Villages'
                // ];
                // $scope.venues = $scope.venues.filter(function(v){
                //     return ignoreList.indexOf(v.categories[0].name) == -1
                // });
                
                
                // google.maps.event.addListenerOnce($scope.map, 'idle', function(){
                //     $scope.venues.forEach(function(v){
                //         var latLng = new google.maps.LatLng(v.latitude, v.longitude);
                //         var marker = new google.maps.Marker({
                //             map: $scope.map,
                //             animation: google.maps.Animation.DROP,
                //             position: latLng
                //         });      
                
                //         var infoWindow = new google.maps.InfoWindow({
                //             content: v.name
                //         });
                
                //         google.maps.event.addListener(marker, 'click', function () {
                //             $scope.showPopup(v);
                //         });    
                //     });

                // });
                
                
            })
            .catch(function(e){
                Utility.logEvent('There was an error loading venues');
                Utility.logEvent(JSON.stringify(e));
            })
            .finally(function(){
                
                $scope.venuesLoading = false;
                $scope.$broadcast('scroll.refreshComplete');

            });
    };
    
    
    $scope.removeVenue = function( venue ){
        Venues.removeVenue(venue.id);
        $scope.venues = $scope.venues.filter(function(obj){
            return venue.id != obj.id; 
        });
      
        var now = new Date();
        $ionicAnalytics.track('Venue Removed', {
            item: {
                time_stamp: now.toUTCString()
            },
        });
      
    };

    // refresh venue list
    $scope.doRefresh = function(){
        loadVenues();
    };
    
    $scope.hasItBeenRevealed = function( venue ){
        var intersection = Venues.getMyReveals().filter(function(obj){
            return obj == venue.id;
        });
        return intersection.length > 0;
    };

    $scope.showPopup = function( venue ){
        if( $scope.hasItBeenRevealed(venue) ){
            $state.go('tab.venue-detail', {venueId: venue.id})
        }else{        
            $ionicPopup.show({
                template: '<p>When you sign the guestbook, your signature will only be visible to other people who also signed.</p><p>So far there are <b>' + venue.total_reveals + ' people</b> who have signed the guestbook for <b>' + venue.name + '</b></p><p style="text-align:center;">Ready to sign?</p>',
                title: 'Cool! Let\'s see who\'s been at ' + venue.name,
                scope: $scope,
                buttons: [
                    { text: 'Not Now',
                      type: 'button-stable'
                    },
                    {
                        text: '<b>Sign</b>',
                        type: 'button-positive',
                        onTap: function(e) {
                            
                            // reveal userself to the server
                            Venues.revealVenue( venue )
                                .then(function(){
                                    
                                    var now = new Date();
                                    $ionicAnalytics.track('User Revealed Checkin', {
                                        item: {
                                            venue: venue.id,
                                            time_stamp: now.toUTCString()
                                        },
                                    });
                                    
                                    $state.go('tab.venue-detail', {venueId: venue.id})
                                    return true;        
                                }, function(e){
                                    
                                    var now = new Date();
                                    $ionicAnalytics.track('User Declined To Reveal Checkin', {
                                        item: {
                                            venue: venue.id,
                                            time_stamp: now.toUTCString()
                                        },
                                    });
                                    
                                    return false;
                                })
                            
                        }
                    }
                ]
            });
        }
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
    
    function centerMap( ){
        
        try {
            GeoTracking.getCurrentCoords()
                .then(function(coords){
                    $scope.map.center.latitude = coords.lat;
                    $scope.map.center.longitude = coords.lng;        
                });    
        } catch (error) {
            console.log("there was an error centering map");
            console.log(JSON.stringify(error));
            $scope.map.center.latitude = 40.740883;
            $scope.map.center.longitude = -74.002228;
        }

    }
    $scope.centerMap = centerMap;
    
    $scope.$on('$ionicView.enter', function(e) {
        console.log("ionicView enter");
        
        if( !Accounts.isAuthenticated() ){
            $state.go('register');
        }else{
            // load venues on entering view
            loadVenues();
            scheduleReminder();
            
            // register app token
            console.log("about to register");
            Accounts.registerForPush();
            
            if(!GeoTracking.isTrackingEnabled()){
                showTrackingPermissionPopup()
                    .then(function(){
                        GeoTracking.startTracking()
                            .then(function(){
                                
                                centerMap();

                            })
                            .catch(function(){
                                // alert('There was an issue starting background tracking');
                            });
                    });
            }else{
                GeoTracking.stopTracking()
                    .then(function(){
                        GeoTracking.startTracking()
                            .then(function(){
                                centerMap();
                            });
                    });
            }
        }
        
        
    });
    
})

.controller('VenuesDetailCtrl', function($scope, $stateParams, $ionicAnalytics, Venues) {
    $scope.loading = true;
    
    function loadVenue(){
        Venues.all()
            .then(function(venues){
                $scope.venue = venues.filter(function(obj){
                    return obj.id == $stateParams.venueId;
                });
                if($scope.venue.length>0){
                    $scope.venue = $scope.venue[0];
                    Venues.getRevealedVenueDetails( $scope.venue )
                        .then(function(visitors){
                            console.log(visitors)
                            $scope.visitors = visitors;
                            $scope.loading=false;
                        });
                };
                 
            });
    }
        
    $scope.$on('$ionicView.enter', function(e) {
        loadVenue();
        
        var now = new Date();
        $ionicAnalytics.track('User Entered Venue Details', {
            item: {
                venue: $stateParams.venueId,
                time_stamp: now.toUTCString()
            },
        });
        
    });

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

.controller('SettingsCtrl', function($scope, $state, $ionicPopup, GeoTracking, Accounts, MovementStore) {
    $scope.geoSettings = {};
    $scope.trackingEnabled = GeoTracking.isTrackingEnabled();
    
    
    $scope.batterySaving = MovementStore.get('battery');
    if( $scope.batterySaving == undefined ){
        $scope.batterySaving = true;
        MovementStore.set('battery', $scope.batterySaving);
    }
    
    $scope.toggleBatterySaving = function(){
        $scope.batterySaving = !$scope.batterySaving;
        MovementStore.set('battery', $scope.batterySaving);
        
        GeoTracking.stopTracking()
            .then(function(){
                GeoTracking.startTracking();
            });
    };
    
    
    $scope.emailLogs = function(){
        GeoTracking.emailLogs()
            .then(function(s){
                Utility.logEvent('Sent email logs');
            });
    };
    
    $scope.toggleTracking = function(){
        
        if($scope.trackingEnabled){
            // stop
            GeoTracking.stopTracking()
                .then(function(){
                    $ionicPopup.alert({
                        title: 'Success',
                        template: 'Background tracking stopped'
                    });
                    $scope.trackingEnabled = GeoTracking.isTrackingEnabled();
                });
        }else{
            // start
            GeoTracking.startTracking()
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
        // GeoTracking.updateBGGeoSettings($scope.geoSettings);
        // $scope.geoSettings = GeoTracking.getBGGeoSettings();
        // $ionicPopup.alert({
        //     title: 'Success',
        //     template: 'Configuration was updated'
        // });
    };
    $scope.resetBGGeoSettings = function(){
        // GeoTracking.resetBGGeoSettings();
        // $scope.geoSettings = GeoTracking.getBGGeoSettings();
        // $ionicPopup.alert({
        //     title: 'Success',
        //     template: 'Configuration was reset'
        // });
    };
    
    $scope.logout = function(){
        Accounts.logout();
        $state.go('register');
    }
})

.controller('AboutCtrl', function($scope) {});
